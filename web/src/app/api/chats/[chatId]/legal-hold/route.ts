import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'https://ws.vusigma.com';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await context.params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        isLegalHold: true,
        legalHoldSetAt: true,
        legalHoldSetById: true,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ legalHold: chat });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await context.params;

    // Check permission: SUPER_ADMIN, ADMIN, or group admin
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

    const isGroupAdmin = chat.participants.some((p) => p.role === 'admin');
    const isPlatformAdmin = user.systemRole === 'SUPER_ADMIN' || user.systemRole === 'ADMIN';

    if (!isPlatformAdmin && !isGroupAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin or Group Admin required to manage Legal Hold' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const isLegalHold = Boolean(body.isLegalHold);
    const reason = String(body.reason || 'Compliance & litigation preservation').trim();

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        isLegalHold,
        legalHoldSetAt: isLegalHold ? new Date() : null,
        legalHoldSetById: isLegalHold ? user.id : null,
      },
    });

    // Record Immutable Audit Log
    await recordAuditLog({
      userId: user.id,
      action: isLegalHold ? 'LEGAL_HOLD_ENABLED' : 'LEGAL_HOLD_DISABLED',
      resource: 'CHAT',
      entityId: chatId,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent'),
      metadata: {
        chatId,
        reason,
        setBy: `@${user.username}`,
      },
    });

    // Broadcast system message in chat
    const systemNotice = isLegalHold
      ? `🛡️ **Legal Hold Activated**: Message deletion and ephemeral cleanup are suspended for compliance by @${user.username}. Reason: ${reason}`
      : `🛡️ **Legal Hold Deactivated**: Normal message deletion and retention policies restored by @${user.username}.`;

    const botMessage = await prisma.message.create({
      data: {
        chatId,
        senderId: user.id,
        messageType: 'system_bot',
        content: systemNotice,
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

    // Update chat last message
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageId: botMessage.id,
        lastMessageAt: botMessage.createdAt,
      },
    }).catch(() => {});

    // Notify WebSocket server
    try {
      await fetch(`${SOCKET_SERVER_URL}/internal/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message: {
            id: botMessage.id,
            chatId,
            senderId: botMessage.senderId,
            content: botMessage.content,
            messageType: 'system_bot',
            type: 'system_bot',
            createdAt: botMessage.createdAt.toISOString(),
            status: 'delivered',
            authorName: 'Compliance Guard',
            sender: botMessage.sender,
            isLegalHold,
          },
        }),
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      legalHold: {
        chatId: updated.id,
        isLegalHold: updated.isLegalHold,
        legalHoldSetAt: updated.legalHoldSetAt,
        legalHoldSetById: updated.legalHoldSetById,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
