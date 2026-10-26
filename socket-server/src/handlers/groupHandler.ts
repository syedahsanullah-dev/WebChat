import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, GroupMemberUpdatePayload } from '../types/index.js';

/**
 * Handles group:join event: subscribes socket to chat:${groupId}
 */
export function handleGroupJoin(
  socket: AuthenticatedWebSocket,
  payload: { groupId?: string; chatId?: string }
): void {
  const groupId = payload?.groupId || payload?.chatId;
  if (!groupId) return;

  roomManager.join(`chat:${groupId}`, socket);
  logger.debug(`User ${socket.username} joined group room chat:${groupId}`);
}

/**
 * Handles group:leave event: removes socket from chat:${groupId}
 */
export function handleGroupLeave(
  socket: AuthenticatedWebSocket,
  payload: { groupId?: string; chatId?: string }
): void {
  const groupId = payload?.groupId || payload?.chatId;
  if (!groupId) return;

  roomManager.leave(`chat:${groupId}`, socket);
  logger.debug(`User ${socket.username} left group room chat:${groupId}`);
}

/**
 * Handles group:member_update event: broadcasts membership changes to all members
 */
export function handleGroupMemberUpdate(
  socket: AuthenticatedWebSocket,
  payload: GroupMemberUpdatePayload
): void {
  if (!payload?.groupId) return;

  const envelope: WsEnvelope<GroupMemberUpdatePayload> = {
    type: 'group:member_update',
    payload,
  };

  roomManager.broadcastToRoom(`chat:${payload.groupId}`, envelope);
  logger.debug(
    `Group member update in chat:${payload.groupId} by ${socket.username}: ${payload.action} on ${payload.userId}`
  );
}
