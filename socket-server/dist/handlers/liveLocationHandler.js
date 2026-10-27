"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLiveLocationStart = handleLiveLocationStart;
exports.handleLiveLocationUpdate = handleLiveLocationUpdate;
exports.handleLiveLocationStop = handleLiveLocationStop;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
async function handleLiveLocationStart(socket, payload) {
    const { chatId, latitude, longitude, durationMinutes = 60, comment, heading, speed, accuracy } = payload;
    const userId = socket.userId;
    if (!chatId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        logger_js_1.logger.debug('Invalid location:live_start parameters');
        return;
    }
    try {
        const validMinutes = [15, 60, 480].includes(durationMinutes) ? durationMinutes : 60;
        const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000);
        // Deactivate previous active live location sessions for this user in this chat
        await prisma_js_1.prisma.liveLocation.updateMany({
            where: {
                chatId,
                userId,
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
        const liveLocation = await prisma_js_1.prisma.liveLocation.create({
            data: {
                chatId,
                userId,
                latitude,
                longitude,
                heading: heading ?? null,
                speed: speed ?? null,
                accuracy: accuracy ?? null,
                comment: comment ? String(comment).slice(0, 255) : null,
                isActive: true,
                expiresAt,
            },
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
        });
        const message = await prisma_js_1.prisma.message.create({
            data: {
                chatId,
                senderId: userId,
                messageType: 'live_location',
                content: comment || 'Live Location',
                latitude,
                longitude,
                locationAddress: comment || 'Live Location Sharing',
                liveLocationId: liveLocation.id,
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
        // Update chat lastMessageAt
        await prisma_js_1.prisma.chat.update({
            where: { id: chatId },
            data: {
                lastMessageId: message.id,
                lastMessageAt: message.createdAt,
            },
        });
        const formattedLiveLocation = {
            id: liveLocation.id,
            chatId: liveLocation.chatId,
            userId: liveLocation.userId,
            userDisplayName: liveLocation.user.displayName || liveLocation.user.username,
            userAvatarUrl: liveLocation.user.avatarUrl,
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
            heading: liveLocation.heading,
            speed: liveLocation.speed,
            accuracy: liveLocation.accuracy,
            comment: liveLocation.comment,
            isActive: liveLocation.isActive,
            startedAt: liveLocation.startedAt.toISOString(),
            expiresAt: liveLocation.expiresAt.toISOString(),
            updatedAt: liveLocation.updatedAt.toISOString(),
        };
        // Broadcast live location started to all connected chat participants
        const startedEnvelope = {
            type: 'location:live_started',
            payload: {
                liveLocation: formattedLiveLocation,
                message,
            },
        };
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, startedEnvelope);
        roomManager_js_1.roomManager.broadcastToRoom(chatId, startedEnvelope);
        logger_js_1.logger.info(`Live location started by user ${userId} in chat ${chatId} (${validMinutes}m)`);
    }
    catch (error) {
        logger_js_1.logger.error('Failed to handle location:live_start:', error);
    }
}
async function handleLiveLocationUpdate(socket, payload) {
    const { liveLocationId, chatId, latitude, longitude, heading, speed, accuracy } = payload;
    const userId = socket.userId;
    if (!liveLocationId || !chatId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return;
    }
    const updatedAt = new Date().toISOString();
    // Sub-5ms fast-path WebSocket broadcast to all room participants
    const updateEnvelope = {
        type: 'location:live_updated',
        payload: {
            liveLocationId,
            chatId,
            userId,
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
            updatedAt,
        },
    };
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, updateEnvelope);
    roomManager_js_1.roomManager.broadcastToRoom(chatId, updateEnvelope);
    // Asynchronous MySQL coordinates update without blocking event loop
    prisma_js_1.prisma.liveLocation
        .update({
        where: { id: liveLocationId },
        data: {
            latitude,
            longitude,
            heading: heading ?? null,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
        },
    })
        .catch((err) => {
        logger_js_1.logger.error(`Error saving live location coordinates update ${liveLocationId}:`, err);
    });
}
async function handleLiveLocationStop(socket, payload) {
    const { liveLocationId, chatId } = payload;
    const userId = socket.userId;
    if (!liveLocationId || !chatId) {
        return;
    }
    try {
        await prisma_js_1.prisma.liveLocation.updateMany({
            where: {
                id: liveLocationId,
                userId,
            },
            data: {
                isActive: false,
            },
        });
        const stopEnvelope = {
            type: 'location:live_stopped',
            payload: {
                liveLocationId,
                chatId,
                userId,
                reason: 'manual',
            },
        };
        roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, stopEnvelope);
        roomManager_js_1.roomManager.broadcastToRoom(chatId, stopEnvelope);
        logger_js_1.logger.info(`Live location stopped manually by user ${userId} (${liveLocationId})`);
    }
    catch (error) {
        logger_js_1.logger.error(`Failed to stop live location ${liveLocationId}:`, error);
    }
}
