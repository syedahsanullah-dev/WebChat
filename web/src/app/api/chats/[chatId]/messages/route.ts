import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { chatId } = await params;
    const currentUserId = authUser.userId;

    // Verify user is a participant of this chat
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: currentUserId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden: You are not a participant of this chat' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '40', 10), 1), 100);

    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        statuses: {
          select: {
            userId: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    let results = messages;

    if (messages.length > limit) {
      const nextItem = results.pop();
      nextCursor = nextItem?.id || null;
    }

    // Map messages with simplified status for the sender
    const formattedMessages = results.map((msg: any) => {
      // Find recipient status
      const recipientStatusRecord = msg.statuses?.find((s: any) => s.userId !== msg.senderId);
      const effectiveStatus = recipientStatusRecord?.status || 'sent';

      return {
        id: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        sender: msg.sender,
        content: msg.isDeleted ? 'This message was deleted' : (msg.content || ''),
        messageType: msg.messageType,
        mediaUrl: msg.isDeleted ? null : msg.mediaUrl,
        mediaSize: msg.mediaSize,
        mediaDuration: msg.mediaDuration,
        replyToMessageId: msg.replyToMessageId,
        isDeleted: msg.isDeleted,
        status: effectiveStatus,
        createdAt: msg.createdAt.toISOString(),
      };
    });

    return NextResponse.json(
      {
        messages: formattedMessages,
        nextCursor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/chats/[chatId]/messages:', error);
    return NextResponse.json({ error: 'Internal server error fetching messages' }, { status: 500 });
  }
}
