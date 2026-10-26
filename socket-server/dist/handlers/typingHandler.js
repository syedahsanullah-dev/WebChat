"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTypingStart = handleTypingStart;
exports.handleTypingStop = handleTypingStop;
const roomManager_js_1 = require("../lib/roomManager.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles typing:start event, broadcasting to chat room and recipient
 */
function handleTypingStart(socket, payload) {
    if (!payload?.chatId)
        return;
    const envelope = {
        type: 'typing:start',
        payload: {
            chatId: payload.chatId,
            userId: socket.userId,
            username: socket.username,
            isTyping: true,
        },
    };
    logger_js_1.logger.debug(`User ${socket.username} started typing in chat ${payload.chatId}`);
    // Broadcast to chat room excluding sender
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${payload.chatId}`, envelope, socket);
    // If specific recipientId was supplied, also deliver to recipient
    if (payload.recipientId) {
        roomManager_js_1.roomManager.sendToUser(payload.recipientId, envelope);
    }
}
/**
 * Handles typing:stop event, broadcasting to chat room and recipient
 */
function handleTypingStop(socket, payload) {
    if (!payload?.chatId)
        return;
    const envelope = {
        type: 'typing:stop',
        payload: {
            chatId: payload.chatId,
            userId: socket.userId,
            username: socket.username,
            isTyping: false,
        },
    };
    logger_js_1.logger.debug(`User ${socket.username} stopped typing in chat ${payload.chatId}`);
    // Broadcast to chat room excluding sender
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${payload.chatId}`, envelope, socket);
    // If specific recipientId was supplied, also deliver to recipient
    if (payload.recipientId) {
        roomManager_js_1.roomManager.sendToUser(payload.recipientId, envelope);
    }
}
