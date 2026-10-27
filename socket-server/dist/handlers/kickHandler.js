"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kickUserSockets = kickUserSockets;
const roomManager_js_1 = require("../lib/roomManager.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Real-time socket kick engine.
 * Sends user:kick envelope and force disconnects all active WebSockets
 * for the target user in < 50ms with close code 4002 (Account Suspended).
 */
function kickUserSockets(userId, reason, suspendedUntil) {
    const sockets = roomManager_js_1.roomManager.getUserSockets(userId);
    if (!sockets || sockets.size === 0) {
        logger_js_1.logger.info(`[kickHandler] User ${userId} has no active WebSocket connections.`);
        return 0;
    }
    const socketArray = Array.from(sockets);
    const envelope = {
        type: 'user:kick',
        payload: {
            userId,
            reason,
            suspendedUntil: suspendedUntil || null,
            suspendedAt: new Date().toISOString(),
            permanent: !suspendedUntil,
        },
    };
    const messageStr = JSON.stringify(envelope);
    for (const socket of socketArray) {
        try {
            if (socket.readyState === socket.OPEN) {
                socket.send(messageStr);
                // Close with RFC-compliant custom code 4002
                socket.close(4002, 'Account Suspended');
            }
        }
        catch (err) {
            logger_js_1.logger.error(`[kickHandler] Error kicking socket for user ${userId}:`, err?.message);
        }
        finally {
            roomManager_js_1.roomManager.leaveAll(socket);
        }
    }
    logger_js_1.logger.info(`🚨 [kickHandler] Force kicked ${socketArray.length} active socket(s) for user ${userId}. Reason: "${reason}"`);
    return socketArray.length;
}
