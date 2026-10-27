import { roomManager, AuthenticatedWebSocket } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, UserKickPayload } from '../types/index.js';

/**
 * Real-time socket kick engine.
 * Sends user:kick envelope and force disconnects all active WebSockets
 * for the target user in < 50ms with close code 4002 (Account Suspended).
 */
export function kickUserSockets(
  userId: string,
  reason: string,
  suspendedUntil?: string | null
): number {
  const sockets = roomManager.getUserSockets(userId);
  if (!sockets || sockets.size === 0) {
    logger.info(`[kickHandler] User ${userId} has no active WebSocket connections.`);
    return 0;
  }

  const socketArray = Array.from(sockets);
  const envelope: WsEnvelope<UserKickPayload> = {
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
    } catch (err: any) {
      logger.error(`[kickHandler] Error kicking socket for user ${userId}:`, err?.message);
    } finally {
      roomManager.leaveAll(socket);
    }
  }

  logger.info(
    `🚨 [kickHandler] Force kicked ${socketArray.length} active socket(s) for user ${userId}. Reason: "${reason}"`
  );
  return socketArray.length;
}
