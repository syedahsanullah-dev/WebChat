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
