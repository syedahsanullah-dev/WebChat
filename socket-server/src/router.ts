import { AuthenticatedWebSocket, roomManager } from './lib/roomManager.js';
import { logger } from './lib/logger.js';
import { handleTypingStart, handleTypingStop } from './handlers/typingHandler.js';
import { handleMessageSend, handleMessageRead } from './handlers/messageHandler.js';
import { handleMessageReaction } from './handlers/reactionHandler.js';
import { handleMessageDelete } from './handlers/deleteHandler.js';
import { handleGroupJoin, handleGroupLeave, handleGroupMemberUpdate } from './handlers/groupHandler.js';
import { handlePollVote } from './handlers/pollHandler.js';
import { handleChatPin } from './handlers/pinHandler.js';
import {
  handleLiveLocationStart,
  handleLiveLocationUpdate,
  handleLiveLocationStop,
} from './handlers/liveLocationHandler.js';
import {
  handleCallInvite,
  handleCallRing,
  handleCallAccept,
  handleCallReject,
  handleCallIceCandidate,
  handleCallEnd,
} from './handlers/callSignalingHandler.js';
import { WsEnvelope } from './types/index.js';

/**
 * Main WebSocket JSON Envelope message router
 */
export function routeWebSocketEnvelope(
  socket: AuthenticatedWebSocket,
  envelope: WsEnvelope
): void {
  switch (envelope.type) {
    case 'ping':
      socket.send(
        JSON.stringify({
          type: 'pong',
          payload: { timestamp: Date.now() },
        })
      );
      break;

    case 'typing:start':
      handleTypingStart(socket, envelope.payload);
      break;

    case 'typing:stop':
      handleTypingStop(socket, envelope.payload);
      break;

    case 'message:send':
      handleMessageSend(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleMessageSend:', err);
      });
      break;

    case 'message:read':
      handleMessageRead(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleMessageRead:', err);
      });
      break;

    case 'message:reaction':
      handleMessageReaction(socket, envelope.payload);
      break;

    case 'message:delete':
      handleMessageDelete(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleMessageDelete:', err);
      });
      break;

    case 'group:join':
      handleGroupJoin(socket, envelope.payload);
      break;

    case 'group:leave':
      handleGroupLeave(socket, envelope.payload);
      break;

    case 'group:member_update':
      handleGroupMemberUpdate(socket, envelope.payload);
      break;

    case 'message:new':
      if (envelope.payload?.chatId) {
        roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope);
      }
      break;

    case 'message:status':
      if (envelope.payload?.chatId) {
        roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope, socket);
      }
      break;

    case 'audio-call:invite':
      handleCallInvite(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleCallInvite:', err);
      });
      break;

    case 'audio-call:ring':
      handleCallRing(socket, envelope.payload);
      break;

    case 'audio-call:accept':
      handleCallAccept(socket, envelope.payload);
      break;

    case 'audio-call:reject':
      handleCallReject(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleCallReject:', err);
      });
      break;

    case 'audio-call:ice-candidate':
      handleCallIceCandidate(socket, envelope.payload);
      break;

    case 'audio-call:end':
      handleCallEnd(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleCallEnd:', err);
      });
      break;

    case 'poll:vote':
      handlePollVote(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handlePollVote:', err);
      });
      break;

    case 'chat:pin':
      handleChatPin(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleChatPin:', err);
      });
      break;

    case 'location:live_start':
      handleLiveLocationStart(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleLiveLocationStart:', err);
      });
      break;

    case 'location:live_update':
      handleLiveLocationUpdate(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleLiveLocationUpdate:', err);
      });
      break;

    case 'location:live_stop':
      handleLiveLocationStop(socket, envelope.payload).catch((err) => {
        logger.error('Error executing handleLiveLocationStop:', err);
      });
      break;

    default:
      // Allow custom chat room subscription
      if ((envelope.type as string) === 'chat:join' && envelope.payload?.chatId) {
        roomManager.join(`chat:${envelope.payload.chatId}`, socket);
        logger.debug(`User ${socket.username} joined room chat:${envelope.payload.chatId}`);
      } else if ((envelope.type as string) === 'chat:leave' && envelope.payload?.chatId) {
        roomManager.leave(`chat:${envelope.payload.chatId}`, socket);
        logger.debug(`User ${socket.username} left room chat:${envelope.payload.chatId}`);
      } else {
        logger.debug(`Unhandled message type: ${envelope.type} from user ${socket.userId}`);
      }
      break;
  }
}
