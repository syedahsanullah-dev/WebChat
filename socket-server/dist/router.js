"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeWebSocketEnvelope = routeWebSocketEnvelope;
const roomManager_js_1 = require("./lib/roomManager.js");
const logger_js_1 = require("./lib/logger.js");
const typingHandler_js_1 = require("./handlers/typingHandler.js");
const messageHandler_js_1 = require("./handlers/messageHandler.js");
const reactionHandler_js_1 = require("./handlers/reactionHandler.js");
const deleteHandler_js_1 = require("./handlers/deleteHandler.js");
const groupHandler_js_1 = require("./handlers/groupHandler.js");
const pollHandler_js_1 = require("./handlers/pollHandler.js");
const pinHandler_js_1 = require("./handlers/pinHandler.js");
const liveLocationHandler_js_1 = require("./handlers/liveLocationHandler.js");
const callSignalingHandler_js_1 = require("./handlers/callSignalingHandler.js");
/**
 * Main WebSocket JSON Envelope message router
 */
function routeWebSocketEnvelope(socket, envelope) {
    switch (envelope.type) {
        case 'ping':
            socket.send(JSON.stringify({
                type: 'pong',
                payload: { timestamp: Date.now() },
            }));
            break;
        case 'typing:start':
            (0, typingHandler_js_1.handleTypingStart)(socket, envelope.payload);
            break;
        case 'typing:stop':
            (0, typingHandler_js_1.handleTypingStop)(socket, envelope.payload);
            break;
        case 'message:send':
            (0, messageHandler_js_1.handleMessageSend)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleMessageSend:', err);
            });
            break;
        case 'message:read':
            (0, messageHandler_js_1.handleMessageRead)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleMessageRead:', err);
            });
            break;
        case 'message:reaction':
            (0, reactionHandler_js_1.handleMessageReaction)(socket, envelope.payload);
            break;
        case 'message:delete':
            (0, deleteHandler_js_1.handleMessageDelete)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleMessageDelete:', err);
            });
            break;
        case 'group:join':
            (0, groupHandler_js_1.handleGroupJoin)(socket, envelope.payload);
            break;
        case 'group:leave':
            (0, groupHandler_js_1.handleGroupLeave)(socket, envelope.payload);
            break;
        case 'group:member_update':
            (0, groupHandler_js_1.handleGroupMemberUpdate)(socket, envelope.payload);
            break;
        case 'message:new':
            if (envelope.payload?.chatId) {
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope);
            }
            break;
        case 'message:status':
            if (envelope.payload?.chatId) {
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope, socket);
            }
            break;
        case 'audio-call:invite':
            (0, callSignalingHandler_js_1.handleCallInvite)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleCallInvite:', err);
            });
            break;
        case 'audio-call:ring':
            (0, callSignalingHandler_js_1.handleCallRing)(socket, envelope.payload);
            break;
        case 'audio-call:accept':
            (0, callSignalingHandler_js_1.handleCallAccept)(socket, envelope.payload);
            break;
        case 'audio-call:reject':
            (0, callSignalingHandler_js_1.handleCallReject)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleCallReject:', err);
            });
            break;
        case 'audio-call:ice-candidate':
            (0, callSignalingHandler_js_1.handleCallIceCandidate)(socket, envelope.payload);
            break;
        case 'audio-call:end':
            (0, callSignalingHandler_js_1.handleCallEnd)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleCallEnd:', err);
            });
            break;
        case 'audio-call:mute':
        case 'audio-call:unmute':
            (0, callSignalingHandler_js_1.handleCallMute)(socket, envelope.payload);
            break;
        case 'audio-call:ice-restart':
            (0, callSignalingHandler_js_1.handleCallIceRestart)(socket, envelope.payload);
            break;
        case 'audio-call:ice-restart-answer':
            (0, callSignalingHandler_js_1.handleCallIceRestartAnswer)(socket, envelope.payload);
            break;
        case 'poll:vote':
            (0, pollHandler_js_1.handlePollVote)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handlePollVote:', err);
            });
            break;
        case 'chat:pin':
            (0, pinHandler_js_1.handleChatPin)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleChatPin:', err);
            });
            break;
        case 'chat:ephemeral_update':
            if (envelope.payload?.chatId) {
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, {
                    type: 'chat:ephemeral_updated',
                    payload: envelope.payload,
                });
            }
            break;
        case 'location:live_start':
            (0, liveLocationHandler_js_1.handleLiveLocationStart)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleLiveLocationStart:', err);
            });
            break;
        case 'location:live_update':
            (0, liveLocationHandler_js_1.handleLiveLocationUpdate)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleLiveLocationUpdate:', err);
            });
            break;
        case 'location:live_stop':
            (0, liveLocationHandler_js_1.handleLiveLocationStop)(socket, envelope.payload).catch((err) => {
                logger_js_1.logger.error('Error executing handleLiveLocationStop:', err);
            });
            break;
        default:
            // Allow custom chat room subscription
            if (envelope.type === 'chat:join' && envelope.payload?.chatId) {
                roomManager_js_1.roomManager.join(`chat:${envelope.payload.chatId}`, socket);
                logger_js_1.logger.debug(`User ${socket.username} joined room chat:${envelope.payload.chatId}`);
            }
            else if (envelope.type === 'chat:leave' && envelope.payload?.chatId) {
                roomManager_js_1.roomManager.leave(`chat:${envelope.payload.chatId}`, socket);
                logger_js_1.logger.debug(`User ${socket.username} left room chat:${envelope.payload.chatId}`);
            }
            else {
                logger_js_1.logger.debug(`Unhandled message type: ${envelope.type} from user ${socket.userId}`);
            }
            break;
    }
}
