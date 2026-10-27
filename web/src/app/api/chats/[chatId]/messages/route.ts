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
        starredBy: {
          where: { userId: currentUserId },
          select: { id: true },
        },
        pinnedIn: {
          where: { chatId },
          select: { id: true, expiresAt: true },
        },
      },
    });

    // Also fetch polls for this chat
    const polls = await prisma.poll.findMany({
      where: { chatId },
      include: {
        options: {
          orderBy: { orderIdx: 'asc' },
          include: {
            votes: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const pollMap = new Map<string, any>();
    polls.forEach((poll) => {
      const allVotes = poll.options.flatMap((o) => o.votes);
      const totalVotes = allVotes.length;
      const formatted = {
        id: poll.id,
        chatId: poll.chatId,
        creatorId: poll.creatorId,
        creatorName: poll.creator.displayName || poll.creator.username,
        question: poll.question,
        allowMultiple: poll.allowMultiple,
        isClosed: poll.isClosed,
        createdAt: poll.createdAt.toISOString(),
        totalVotes,
        hasVoted: allVotes.some((v) => v.userId === currentUserId),
        options: poll.options.map((opt) => ({
          id: opt.id,
          pollId: opt.pollId,
          text: opt.text,
          orderIdx: opt.orderIdx,
          voteCount: opt.votes.length,
          percentage: totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0,
          hasVoted: opt.votes.some((v) => v.userId === currentUserId),
          voterAvatars: opt.votes
            .map((v) => v.user.avatarUrl)
            .filter((url): url is string => Boolean(url))
            .slice(0, 3),
          voterIds: opt.votes.map((v) => v.userId),
        })),
      };
      pollMap.set(poll.id, formatted);
      pollMap.set(poll.question, formatted);
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
        isE2EE: Boolean(msg.isE2EE),
        e2eeIv: msg.e2eeIv || null,
        latitude: msg.latitude ?? null,
        longitude: msg.longitude ?? null,
        locationAddress: msg.locationAddress ?? null,
        status: effectiveStatus,
        createdAt: msg.createdAt.toISOString(),
        isStarred: Boolean(msg.starredBy && msg.starredBy.length > 0),
        isPinned: Boolean(msg.pinnedIn && msg.pinnedIn.length > 0),
        poll: msg.messageType === 'poll' ? pollMap.get(msg.content) || pollMap.get(msg.id) || null : null,
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
