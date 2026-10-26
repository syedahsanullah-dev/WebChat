import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, MessageReactionPayload } from '../types/index.js';

// In-memory fast cache of reactions: messageId -> Map<emoji, Set<userId>>
const reactionStore = new Map<string, Map<string, Set<string>>>();

/**
 * Handles incoming message:reaction event:
 * Toggles or updates emoji reaction and broadcasts to the chat room
 */
export function handleMessageReaction(
  socket: AuthenticatedWebSocket,
  payload: MessageReactionPayload
): void {
  if (!payload?.chatId || !payload?.messageId || !payload?.emoji) {
    return;
  }

  const { chatId, messageId, emoji, action } = payload;
  const userId = socket.userId;

  let messageReactions = reactionStore.get(messageId);
  if (!messageReactions) {
    messageReactions = new Map();
    reactionStore.set(messageId, messageReactions);
  }

  let userSet = messageReactions.get(emoji);
  if (!userSet) {
    userSet = new Set();
    messageReactions.set(emoji, userSet);
  }

  let effectiveAction = action;
  if (!effectiveAction) {
    // If no explicit action, toggle
    effectiveAction = userSet.has(userId) ? 'remove' : 'add';
  }

  if (effectiveAction === 'add') {
    userSet.add(userId);
  } else {
    userSet.delete(userId);
    if (userSet.size === 0) {
      messageReactions.delete(emoji);
    }
  }

  const broadcastEnvelope: WsEnvelope<MessageReactionPayload> = {
    type: 'message:reaction',
    payload: {
      chatId,
      messageId,
      userId,
      emoji,
      action: effectiveAction,
    },
  };

  // Broadcast to all participants in this chat room
  roomManager.broadcastToRoom(`chat:${chatId}`, broadcastEnvelope);
  logger.debug(
    `Reaction ${emoji} (${effectiveAction}) on message ${messageId} in chat:${chatId} by ${socket.username}`
  );
}
