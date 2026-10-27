import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * POST /api/polls/:id/vote
 * Cast or toggle a vote on a poll option
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: pollId } = await params;
    const body = await request.json();
    const { optionId } = body;

    if (!optionId || typeof optionId !== 'string') {
      return NextResponse.json({ error: 'optionId is required' }, { status: 400 });
    }

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (poll.isClosed) {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 400 });
    }

    const targetOption = poll.options.find((o) => o.id === optionId);
    if (!targetOption) {
      return NextResponse.json({ error: 'Option does not belong to this poll' }, { status: 400 });
    }

    const userId = authUser.userId;

    // Execute atomic vote update
    await prisma.$transaction(async (tx) => {
      const existingVote = await tx.pollVote.findUnique({
        where: {
          pollId_optionId_userId: {
            pollId,
            optionId,
            userId,
          },
        },
      });

      if (!poll.allowMultiple) {
        // Single choice poll: delete any previous votes for this poll
        await tx.pollVote.deleteMany({
          where: {
            pollId,
            userId,
          },
        });

        // If the user clicked the already selected option in a single choice poll,
        // it unselects it. If they clicked an unselected one, it casts the new vote.
        if (!existingVote) {
          await tx.pollVote.create({
            data: {
              pollId,
              optionId,
              userId,
            },
          });
        }
      } else {
        // Multiple choice poll: toggle option vote
        if (existingVote) {
          await tx.pollVote.delete({
            where: { id: existingVote.id },
          });
        } else {
          await tx.pollVote.create({
            data: {
              pollId,
              optionId,
              userId,
            },
          });
        }
      }
    });

    // Re-fetch updated poll tallies
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
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
      },
    });

    if (!updatedPoll) {
      return NextResponse.json({ error: 'Poll not found after voting' }, { status: 500 });
    }

    const allVotes = updatedPoll.options.flatMap((o) => o.votes);
    const totalVotes = allVotes.length;

    const formattedOptions = updatedPoll.options.map((opt) => {
      const voteCount = opt.votes.length;
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
      const hasVoted = opt.votes.some((v) => v.userId === userId);
      const voterAvatars = opt.votes
        .map((v) => v.user.avatarUrl)
        .filter((url): url is string => Boolean(url))
        .slice(0, 3);
      const voterIds = opt.votes.map((v) => v.userId);

      return {
        id: opt.id,
        pollId: opt.pollId,
        text: opt.text,
        orderIdx: opt.orderIdx,
        voteCount,
        percentage,
        hasVoted,
        voterAvatars,
        voterIds,
      };
    });

    return NextResponse.json({
      pollId: updatedPoll.id,
      chatId: updatedPoll.chatId,
      totalVotes,
      options: formattedOptions,
      hasVoted: allVotes.some((v) => v.userId === userId),
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}
