"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGroupJoin = handleGroupJoin;
exports.handleGroupLeave = handleGroupLeave;
exports.handleGroupMemberUpdate = handleGroupMemberUpdate;
const roomManager_js_1 = require("../lib/roomManager.js");
const logger_js_1 = require("../lib/logger.js");
/**
 * Handles group:join event: subscribes socket to chat:${groupId}
 */
function handleGroupJoin(socket, payload) {
    const groupId = payload?.groupId || payload?.chatId;
    if (!groupId)
        return;
    roomManager_js_1.roomManager.join(`chat:${groupId}`, socket);
    logger_js_1.logger.debug(`User ${socket.username} joined group room chat:${groupId}`);
}
/**
 * Handles group:leave event: removes socket from chat:${groupId}
 */
function handleGroupLeave(socket, payload) {
    const groupId = payload?.groupId || payload?.chatId;
    if (!groupId)
        return;
    roomManager_js_1.roomManager.leave(`chat:${groupId}`, socket);
    logger_js_1.logger.debug(`User ${socket.username} left group room chat:${groupId}`);
}
/**
 * Handles group:member_update event: broadcasts membership changes to all members
 */
function handleGroupMemberUpdate(socket, payload) {
    if (!payload?.groupId)
        return;
    const envelope = {
        type: 'group:member_update',
        payload,
    };
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${payload.groupId}`, envelope);
    logger_js_1.logger.debug(`Group member update in chat:${payload.groupId} by ${socket.username}: ${payload.action} on ${payload.userId}`);
}
