"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatPin = handleChatPin;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles incoming chat:pin event:
 * 1. Validates chat and message existence
 * 2. Enforces maximum 3 pinned messages per chat (unpins oldest if exceeded)
 * 3. Persists PinnedMessage with optional expiresAt duration
 * 4. Broadcasts chat:pin_updated to all participants in room
 */
async function handleChatPin(socket, payload) {
    if (!payload?.chatId || !payload?.messageId) {
        logger_js_1.logger.debug('Invalid chat:pin payload');
        return;
    }
    const { chatId, messageId, durationSeconds } = payload;
    const userId = socket.userId;
    try {
        // Verify target message exists in the specified chat
        const message = await prisma_js_1.prisma.message.findUnique({
            where: { id: messageId },
            include: {
                sender: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
        if (!message || message.chatId !== chatId) {
            logger_js_1.logger.debug(`Message ${messageId} does not belong to chat ${chatId}`);
            return;
        }
        // Calculate optional expiration timestamp
        const expiresAt = durationSeconds && durationSeconds > 0
            ? new Date(Date.now() + durationSeconds * 1000)
            : null;
        // Upsert pinned message
        const pinnedRecord = await prisma_js_1.prisma.pinnedMessage.upsert({
            where: {
                chatId_messageId: {
                    chatId,
                    messageId,
                },
            },
            create: {
                chatId,
                messageId,
                pinnedById: userId,
                expiresAt,
            },
            update: {
                pinnedById: userId,
                expiresAt,
                pinnedAt: new Date(),
            },
        });
        // Enforce limit: max 3 pinned messages per conversation
        const allPins = await prisma_js_1.prisma.pinnedMessage.findMany({
            where: { chatId },
            orderBy: { pinnedAt: 'desc' },
        });
        if (allPins.length > 3) {
            const pinsToDelete = allPins.slice(3);
            await prisma_js_1.prisma.pinnedMessage.deleteMany({
                where: {
                    id: { in: pinsToDelete.map((p) => p.id) },
                },
            });
        }
        // Retrieve active pins
        const activePins = await prisma_js_1.prisma.pinnedMessage.findMany({
            where: { chatId },
            orderBy: { pinnedAt: 'desc' },
            take: 3,
            include: {
                message: {
                    select: {
                        content: true,
                        messageType: true,
                        sender: {
                            select: { displayName: true, username: true },
                        },
                    },
                },
                pinnedBy: {
                    select: { displayName: true, username: true },
                },
            },
        });
        const formattedActivePins = activePins.map((pin) => ({
            id: pin.id,
            chatId: pin.chatId,
            messageId: pin.messageId,
            pinnedById: pin.pinnedById,
            pinnedByName: pin.pinnedBy.displayName || pin.pinnedBy.username,
            expiresAt: pin.expiresAt ? pin.expiresAt.toISOString() : null,
            pinnedAt: pin.pinnedAt.toISOString(),
            messageSnippet: pin.message.content ? pin.message.content.slice(0, 80) : '',
            messageSenderName: pin.message.sender.displayName || pin.message.sender.username,
        }));
        const updateEnvelope = {
            type: 'chat:pin_updated',
            payload: {
                chatId,
                action: 'pinned',
                pinnedMessage: {
                    id: pinnedRecord.id,
                    chatId,
                    messageId,
                    pinnedById: userId,
                    expiresAt: pinnedRecord.expiresAt ? pinnedRecord.expiresAt.toISOString() : null,
                    pinnedAt: pinnedRecord.pinnedAt.toISOString(),
                    messageSnippet: message.content ? message.content.slice(0, 80) : '',
                    messageSenderName: message.sender.displayName || message.sender.username,
                },
                activePins: formattedActivePins,
            },
        };
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, updateEnvelope);
    }
    catch (error) {
        logger_js_1.logger.error('Error in handleChatPin:', error);
    }
}
