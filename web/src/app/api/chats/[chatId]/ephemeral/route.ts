import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getEphemeralSystemMessageText } from '@/lib/ephemeralUtils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const { chatId } = await params;
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Verify chat existence and membership
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          where: { userId: authUser.id },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.participants.length === 0) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this chat' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const rawDuration = body.duration;

    // Validate allowed durations: 86400 (24h), 604800 (7d), 7776000 (90d), or null (Off)
    let duration: number | null = null;
    if (rawDuration !== null && rawDuration !== undefined) {
      const num = Number(rawDuration);
      if (![86400, 604800, 7776000].includes(num)) {
        return NextResponse.json(
          { error: 'Invalid duration. Allowed values: 86400 (24h), 604800 (7d), 7776000 (90d), or null (Off)' },
          { status: 400 }
        );
      }
      duration = num;
    }

    // Update Chat ephemeral settings
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ephemeralDuration: duration,
      },
    });

    // Create in-chat system notification message
    const systemNotice = getEphemeralSystemMessageText(
      authUser.username || 'You',
      duration
    );

    const systemMsg = await prisma.message.create({
      data: {
        chatId,
        senderId: authUser.id,
        content: systemNotice,
        messageType: 'system',
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

    return NextResponse.json({
      success: true,
      ephemeralDuration: updatedChat.ephemeralDuration,
      message: systemMsg,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/chats/[id]/ephemeral:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update disappearing messages settings' },
      { status: 500 }
    );
  }
}
