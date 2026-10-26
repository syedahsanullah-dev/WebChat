"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserConnect = handleUserConnect;
exports.handleUserDisconnect = handleUserDisconnect;
const roomManager_js_1 = require("../lib/roomManager.js");
const prisma_js_1 = require("../lib/prisma.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles incoming connection presence setup and broadcast
 */
async function handleUserConnect(socket) {
    const isFirstConnection = !roomManager_js_1.roomManager.isUserOnline(socket.userId);
    // Register in in-memory room manager
    roomManager_js_1.roomManager.registerUser(socket.userId, socket);
    // Send snapshot of all currently online users to the newly connected socket
    const initEnvelope = {
        type: 'presence:init',
        payload: {
            onlineUserIds: roomManager_js_1.roomManager.getOnlineUserIds(),
        },
    };
    socket.send(JSON.stringify(initEnvelope));
    // Send personal online confirmation to the newly connected socket
    const selfEnvelope = {
        type: 'user:online',
        payload: {
            userId: socket.userId,
            username: socket.username,
        },
    };
    socket.send(JSON.stringify(selfEnvelope));
    // If this is the user's first active tab/connection, broadcast to everyone and update DB
    if (isFirstConnection) {
        logger_js_1.logger.info(`User ${socket.username} (${socket.userId}) is now ONLINE`);
        // Broadcast user:online to all connected clients
        roomManager_js_1.roomManager.broadcastAll(selfEnvelope, socket);
        // Update MySQL asynchronously without blocking the event loop
        prisma_js_1.prisma.user
            .update({
            where: { id: socket.userId },
            data: { isOnline: true },
        })
            .catch((err) => {
            logger_js_1.logger.debug(`Could not update isOnline in DB (non-fatal): ${err.message}`);
        });
    }
}
/**
 * Handles disconnection, cleanup, and offline broadcast when all tabs close
 */
async function handleUserDisconnect(socket) {
    // Remove socket from all rooms and user sockets map
    roomManager_js_1.roomManager.leaveAll(socket);
    // Check if the user still has other open tabs/devices
    const stillOnline = roomManager_js_1.roomManager.isUserOnline(socket.userId);
    if (!stillOnline) {
        const lastSeenDate = new Date();
        const lastSeenIso = lastSeenDate.toISOString();
        logger_js_1.logger.info(`User ${socket.username} (${socket.userId}) is now OFFLINE (lastSeen: ${lastSeenIso})`);
        // Broadcast user:offline to all remaining connected clients
        const offlineEnvelope = {
            type: 'user:offline',
            payload: {
                userId: socket.userId,
                lastSeen: lastSeenIso,
            },
        };
        roomManager_js_1.roomManager.broadcastAll(offlineEnvelope);
        // Update MySQL asynchronously
        prisma_js_1.prisma.user
            .update({
            where: { id: socket.userId },
            data: {
                isOnline: false,
                lastSeen: lastSeenDate,
            },
        })
            .catch((err) => {
            logger_js_1.logger.debug(`Could not update lastSeen in DB (non-fatal): ${err.message}`);
        });
    }
}
