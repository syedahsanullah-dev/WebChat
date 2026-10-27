import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, PollVotePayload, PollUpdatePayload } from '../types/index.js';

/**
 * Handles incoming poll:vote event:
 * 1. Validates socket session and option presence
 * 2. Toggles or casts vote in MySQL
 * 3. Re-calculates tallies and percentages
 * 4. Broadcasts poll:update envelope to all chat participants
 */
export async function handlePollVote(
  socket: AuthenticatedWebSocket,
  payload: PollVotePayload
): Promise<void> {
  if (!payload?.pollId || !payload?.optionId) {
    logger.debug('Invalid poll:vote payload received');
    return;
  }

  const { pollId, optionId } = payload;
  const userId = socket.userId;

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
      },
    });

    if (!poll || poll.isClosed) {
      logger.debug(`Poll ${pollId} not found or closed`);
      return;
    }

    const targetOption = poll.options.find((o) => o.id === optionId);
    if (!targetOption) {
      logger.debug(`Option ${optionId} does not belong to poll ${pollId}`);
      return;
    }

    // Atomic transaction for single-choice vs multi-choice
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
        // Single choice: delete all previous votes by this user in this poll
        await tx.pollVote.deleteMany({
          where: {
            pollId,
            userId,
          },
        });

        // Toggle vote: if it was not already voted, create it
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
        // Multi-choice: toggle vote
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

    // Re-calculate updated tallies
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { orderIdx: 'asc' },
          include: {
            votes: true,
          },
        },
      },
    });

    if (!updatedPoll) return;

    const allVotes = updatedPoll.options.flatMap((o) => o.votes);
    const totalVotes = allVotes.length;

    const optionsData = updatedPoll.options.map((opt) => {
      const voteCount = opt.votes.length;
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
      const voterIds = opt.votes.map((v) => v.userId);

      return {
        id: opt.id,
        text: opt.text,
        orderIdx: opt.orderIdx,
        voteCount,
        percentage,
        voterIds,
      };
    });

    const updateEnvelope: WsEnvelope<PollUpdatePayload> = {
      type: 'poll:update',
      payload: {
        pollId: updatedPoll.id,
        chatId: updatedPoll.chatId,
        totalVotes,
        options: optionsData,
      },
    };

    // Broadcast to chat room (including sender so UI updates synchronously)
    roomManager.broadcastToRoom(`chat:${updatedPoll.chatId}`, updateEnvelope);
  } catch (error) {
    logger.error('Error handling poll:vote:', error);
  }
}
