"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePollVote = handlePollVote;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles incoming poll:vote event:
 * 1. Validates socket session and option presence
 * 2. Toggles or casts vote in MySQL
 * 3. Re-calculates tallies and percentages
 * 4. Broadcasts poll:update envelope to all chat participants
 */
async function handlePollVote(socket, payload) {
    if (!payload?.pollId || !payload?.optionId) {
        logger_js_1.logger.debug('Invalid poll:vote payload received');
        return;
    }
    const { pollId, optionId } = payload;
    const userId = socket.userId;
    try {
        const poll = await prisma_js_1.prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: true,
            },
        });
        if (!poll || poll.isClosed) {
            logger_js_1.logger.debug(`Poll ${pollId} not found or closed`);
            return;
        }
        const targetOption = poll.options.find((o) => o.id === optionId);
        if (!targetOption) {
            logger_js_1.logger.debug(`Option ${optionId} does not belong to poll ${pollId}`);
            return;
        }
        // Atomic transaction for single-choice vs multi-choice
        await prisma_js_1.prisma.$transaction(async (tx) => {
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
            }
            else {
                // Multi-choice: toggle vote
                if (existingVote) {
                    await tx.pollVote.delete({
                        where: { id: existingVote.id },
                    });
                }
                else {
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
        const updatedPoll = await prisma_js_1.prisma.poll.findUnique({
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
        if (!updatedPoll)
            return;
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
        const updateEnvelope = {
            type: 'poll:update',
            payload: {
                pollId: updatedPoll.id,
                chatId: updatedPoll.chatId,
                totalVotes,
                options: optionsData,
            },
        };
        // Broadcast to chat room (including sender so UI updates synchronously)
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${updatedPoll.chatId}`, updateEnvelope);
    }
    catch (error) {
        logger_js_1.logger.error('Error handling poll:vote:', error);
    }
}
