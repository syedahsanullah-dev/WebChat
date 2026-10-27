import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * POST /api/polls
 * Create a new interactive poll inside a chat
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, question, options, allowMultiple } = body;

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing chatId' }, { status: 400 });
    }

    const trimmedQuestion = (question || '').trim();
    if (!trimmedQuestion || trimmedQuestion.length > 500) {
      return NextResponse.json({ error: 'Question must be between 1 and 500 characters' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 12) {
      return NextResponse.json({ error: 'Polls must contain between 2 and 12 options' }, { status: 400 });
    }

    const cleanedOptions = options
      .map((opt: any) => (typeof opt === 'string' ? opt.trim() : ''))
      .filter((opt: string) => opt.length > 0);

    if (cleanedOptions.length < 2) {
      return NextResponse.json({ error: 'At least 2 non-empty options are required' }, { status: 400 });
    }

    // Verify user is a participant of the chat
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: {
        chatId,
        userId: authUser.userId,
      },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden: You are not a participant in this conversation' }, { status: 403 });
    }

    // Atomic transaction: create Poll, PollOptions, and Message
    const result = await prisma.$transaction(async (tx) => {
      const poll = await tx.poll.create({
        data: {
          chatId,
          creatorId: authUser.userId,
          question: trimmedQuestion,
          allowMultiple: Boolean(allowMultiple),
          options: {
            create: cleanedOptions.map((text: string, idx: number) => ({
              text,
              orderIdx: idx,
            })),
          },
        },
        include: {
          options: {
            orderBy: { orderIdx: 'asc' },
          },
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      const message = await tx.message.create({
        data: {
          chatId,
          senderId: authUser.userId,
          messageType: 'poll',
          content: trimmedQuestion,
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

      await tx.chat.update({
        where: { id: chatId },
        data: {
          lastMessageAt: message.createdAt,
          lastMessageId: message.id,
        },
      });

      return { poll, message };
    });

    const formattedPoll = {
      id: result.poll.id,
      chatId: result.poll.chatId,
      creatorId: result.poll.creatorId,
      creatorName: result.poll.creator.displayName || result.poll.creator.username,
      question: result.poll.question,
      allowMultiple: result.poll.allowMultiple,
      isClosed: result.poll.isClosed,
      createdAt: result.poll.createdAt.toISOString(),
      totalVotes: 0,
      options: result.poll.options.map((opt) => ({
        id: opt.id,
        pollId: opt.pollId,
        text: opt.text,
        orderIdx: opt.orderIdx,
        voteCount: 0,
        percentage: 0,
        hasVoted: false,
        voterAvatars: [],
      })),
    };

    return NextResponse.json({
      poll: formattedPoll,
      message: {
        ...result.message,
        poll: formattedPoll,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}

/**
 * GET /api/polls?chatId=...
 * Fetch polls for a chat
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    const polls = await prisma.poll.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 20,
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

    const formattedPolls = polls.map((poll) => {
      const allVotes = poll.options.flatMap((o) => o.votes);
      const totalVotes = allVotes.length;

      return {
        id: poll.id,
        chatId: poll.chatId,
        creatorId: poll.creatorId,
        creatorName: poll.creator.displayName || poll.creator.username,
        question: poll.question,
        allowMultiple: poll.allowMultiple,
        isClosed: poll.isClosed,
        createdAt: poll.createdAt.toISOString(),
        totalVotes,
        hasVoted: allVotes.some((v) => v.userId === authUser.userId),
        options: poll.options.map((opt) => {
          const voteCount = opt.votes.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = opt.votes.some((v) => v.userId === authUser.userId);
          const voterAvatars = opt.votes
            .map((v) => v.user.avatarUrl)
            .filter((url): url is string => Boolean(url))
            .slice(0, 3);

          return {
            id: opt.id,
            pollId: opt.pollId,
            text: opt.text,
            orderIdx: opt.orderIdx,
            voteCount,
            percentage,
            hasVoted,
            voterAvatars,
          };
        }),
      };
    });

    return NextResponse.json({ polls: formattedPolls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
  }
}
