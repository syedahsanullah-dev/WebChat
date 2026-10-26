import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope } from '../types/index.js';

export interface TypingEventPayload {
  chatId: string;
  recipientId?: string;
}

/**
 * Handles typing:start event, broadcasting to chat room and recipient
 */
export function handleTypingStart(
  socket: AuthenticatedWebSocket,
  payload: TypingEventPayload
): void {
  if (!payload?.chatId) return;

  const envelope: WsEnvelope = {
    type: 'typing:start',
    payload: {
      chatId: payload.chatId,
      userId: socket.userId,
      username: socket.username,
      isTyping: true,
    },
  };

  logger.debug(`User ${socket.username} started typing in chat ${payload.chatId}`);

  // Broadcast to chat room excluding sender
  roomManager.broadcastToRoom(`chat:${payload.chatId}`, envelope, socket);

  // If specific recipientId was supplied, also deliver to recipient
  if (payload.recipientId) {
    roomManager.sendToUser(payload.recipientId, envelope);
  }
}

/**
 * Handles typing:stop event, broadcasting to chat room and recipient
 */
export function handleTypingStop(
  socket: AuthenticatedWebSocket,
  payload: TypingEventPayload
): void {
  if (!payload?.chatId) return;

  const envelope: WsEnvelope = {
    type: 'typing:stop',
    payload: {
      chatId: payload.chatId,
      userId: socket.userId,
      username: socket.username,
      isTyping: false,
    },
  };

  logger.debug(`User ${socket.username} stopped typing in chat ${payload.chatId}`);

  // Broadcast to chat room excluding sender
  roomManager.broadcastToRoom(`chat:${payload.chatId}`, envelope, socket);

  // If specific recipientId was supplied, also deliver to recipient
  if (payload.recipientId) {
    roomManager.sendToUser(payload.recipientId, envelope);
  }
}
