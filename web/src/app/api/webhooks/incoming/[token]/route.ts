import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/webhookValidator';
import { dispatchOutboundWebhooks } from '@/lib/outboundDispatcher';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'https://ws.vusigma.com';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const webhook = await prisma.webhook.findUnique({
      where: { token },
      include: {
        chat: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!webhook || webhook.direction !== 'INBOUND') {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (!webhook.isActive) {
      return NextResponse.json({ error: 'Webhook is disabled' }, { status: 403 });
    }

    // Read raw body for HMAC signature verification
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get('x-signature-sha256') ||
      request.headers.get('x-hub-signature-256') ||
      request.headers.get('x-webchat-signature');

    if (signatureHeader) {
      const isValid = verifyWebhookSignature(rawBody, webhook.secret, signatureHeader);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid HMAC SHA-256 signature' },
          { status: 401 }
        );
      }
    }

    let parsedBody: any = {};
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { text: rawBody };
    }

    // Support standard fields: text, content, message
    const rawText = parsedBody.text || parsedBody.content || parsedBody.message;
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json(
        { error: 'Missing required "text" or "content" field in webhook payload' },
        { status: 400 }
      );
    }

    const text = rawText.trim().slice(0, 2000);
    const author = (parsedBody.author || parsedBody.sender || webhook.name || 'Bot').slice(0, 50);
    const avatarUrl = parsedBody.avatarUrl || null;

    // Create system bot message in database
    const botMessage = await prisma.message.create({
      data: {
        chatId: webhook.chatId,
        senderId: webhook.creatorId,
        messageType: 'system_bot',
        content: text,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update webhook timestamp
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { lastFiredAt: new Date() },
    }).catch(() => {});

    // Update chat last message
    await prisma.chat.update({
      where: { id: webhook.chatId },
      data: {
        lastMessageId: botMessage.id,
        lastMessageAt: botMessage.createdAt,
      },
    }).catch(() => {});

    // Broadcast in real-time to Server #2 WebSocket room
    try {
      await fetch(`${SOCKET_SERVER_URL}/internal/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: webhook.chatId,
          message: {
            id: botMessage.id,
            chatId: botMessage.chatId,
            senderId: botMessage.senderId,
            content: botMessage.content,
            messageType: 'system_bot',
            type: 'system_bot',
            createdAt: botMessage.createdAt.toISOString(),
            status: 'delivered',
            authorName: author,
            avatarUrl,
            sender: {
              ...botMessage.sender,
              displayName: author,
              avatarUrl: avatarUrl || botMessage.sender.avatarUrl,
            },
          },
        }),
      });
    } catch (wsErr: any) {
      logger.warn(`Could not broadcast inbound webhook to socket server: ${wsErr?.message || wsErr}`);
    }

    // Trigger outbound webhooks non-blocking
    dispatchOutboundWebhooks(webhook.chatId, 'message:created', botMessage).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        messageId: botMessage.id,
        chatId: webhook.chatId,
        author,
        timestamp: botMessage.createdAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Error handling inbound webhook:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
