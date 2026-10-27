import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * GET /api/polls/:id/results
 * Returns full voter roster breakdown grouped by option
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: pollId } = await params;

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { orderIdx: 'asc' },
          include: {
            votes: {
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const optionsResults = poll.options.map((opt) => ({
      optionId: opt.id,
      text: opt.text,
      orderIdx: opt.orderIdx,
      voteCount: opt.votes.length,
      voters: opt.votes.map((v) => ({
        userId: v.user.id,
        username: v.user.username,
        displayName: v.user.displayName,
        avatarUrl: v.user.avatarUrl,
        votedAt: v.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      pollId: poll.id,
      question: poll.question,
      allowMultiple: poll.allowMultiple,
      isClosed: poll.isClosed,
      createdAt: poll.createdAt.toISOString(),
      options: optionsResults,
    });
  } catch (error) {
    console.error('Error fetching poll results:', error);
    return NextResponse.json({ error: 'Failed to fetch poll results' }, { status: 500 });
  }
}
