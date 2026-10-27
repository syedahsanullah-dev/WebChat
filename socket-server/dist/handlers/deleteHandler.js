"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageDelete = handleMessageDelete;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles incoming message:delete event:
 * - "Delete for everyone": Updates MySQL isDeleted = true and broadcasts to room
 * - "Delete for me": Acknowledges to the sender socket only
 */
async function handleMessageDelete(socket, payload) {
    if (!payload?.chatId || !payload?.messageId) {
        return;
    }
    const { chatId, messageId, deleteType = 'everyone' } = payload;
    // Phase 28: Legal Hold Guard - Block deletion if chat is under legal hold
    try {
        const chat = await prisma_js_1.prisma.chat.findUnique({
            where: { id: chatId },
            select: { isLegalHold: true },
        });
        if (chat?.isLegalHold) {
            logger_js_1.logger.warn(`Rejected message delete: Chat ${chatId} is under active Legal Hold.`);
            socket.send(JSON.stringify({
                type: 'error',
                payload: {
                    code: 'LEGAL_HOLD_ACTIVE',
                    message: 'Cannot delete messages: This conversation is under active Legal Hold.',
                },
            }));
            return;
        }
    }
    catch (err) {
        logger_js_1.logger.error('Error verifying legal hold in deleteHandler:', err);
    }
    if (deleteType === 'everyone') {
        try {
            // Update in MySQL
            await prisma_js_1.prisma.message.update({
                where: { id: messageId },
                data: {
                    isDeleted: true,
                    content: '🚫 This message was deleted',
                    mediaUrl: null,
                },
            });
        }
        catch (err) {
            logger_js_1.logger.debug(`Could not update isDeleted in DB (non-fatal): ${err.message}`);
        }
        const envelope = {
            type: 'message:delete',
            payload: {
                chatId,
                messageId,
                deleteType: 'everyone',
                userId: socket.userId,
            },
        };
        // Broadcast to room so all clients update the message bubble
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, envelope);
        logger_js_1.logger.info(`Message ${messageId} deleted for everyone by ${socket.username}`);
    }
    else {
        // Delete for me only
        const envelope = {
            type: 'message:delete',
            payload: {
                chatId,
                messageId,
                deleteType: 'forMe',
                userId: socket.userId,
            },
        };
        socket.send(JSON.stringify(envelope));
        logger_js_1.logger.debug(`Message ${messageId} deleted for me by ${socket.username}`);
    }
}
