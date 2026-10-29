import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await context.params;

    // Verify user is in the chat
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: user.id },
    });

    if (!participant && user.systemRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        chatId: true,
        creatorId: true,
        name: true,
        token: true,
        direction: true,
        targetUrl: true,
        events: true,
        isActive: true,
        lastFiredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const host = request.headers.get('host') || 'chat.vusigma.com';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    const enriched = webhooks.map((w) => ({
      ...w,
      incomingUrl:
        w.direction === 'INBOUND'
          ? `${baseUrl}/api/webhooks/incoming/${w.token}`
          : undefined,
    }));

    return NextResponse.json({ webhooks: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await context.params;

    // Verify chat exists and user is participant (or group admin)
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          where: { userId: user.id },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const isMember = chat.participants.length > 0;
    if (!isMember && user.systemRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const direction = body.direction === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND';
    const targetUrl = body.targetUrl ? String(body.targetUrl).trim() : null;
    const events = String(body.events || 'message:created').trim();

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: 'Webhook name is required (max 100 characters)' },
        { status: 400 }
      );
    }

    if (direction === 'OUTBOUND' && !targetUrl) {
      return NextResponse.json(
        { error: 'Target URL is required for outbound webhooks' },
        { status: 400 }
      );
    }

    // Generate cryptographically secure tokens
    const token = crypto.randomBytes(32).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        chatId,
        creatorId: user.id,
        name,
        token,
        secret,
        direction,
        targetUrl,
        events,
        isActive: true,
      },
    });

    const host = request.headers.get('host') || 'chat.vusigma.com';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json(
      {
        webhook: {
          ...webhook,
          incomingUrl:
            webhook.direction === 'INBOUND'
              ? `${baseUrl}/api/webhooks/incoming/${webhook.token}`
              : undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
