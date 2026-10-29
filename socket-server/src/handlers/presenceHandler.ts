import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope, UserOnlinePayload, UserOfflinePayload } from '../types/index.js';
import { handleSocketDisconnectForCalls, checkPendingCallsForUser } from './callSignalingHandler.js';

/**
 * Handles incoming connection presence setup and broadcast
 */
export async function handleUserConnect(socket: AuthenticatedWebSocket): Promise<void> {
  const isFirstConnection = !roomManager.isUserOnline(socket.userId);

  // Register in in-memory room manager
  roomManager.registerUser(socket.userId, socket);

  // Send snapshot of all currently online users to the newly connected socket
  const initEnvelope: WsEnvelope<{ onlineUserIds: string[] }> = {
    type: 'presence:init',
    payload: {
      onlineUserIds: roomManager.getOnlineUserIds(),
    },
  };
  socket.send(JSON.stringify(initEnvelope));

  // Send personal online confirmation to the newly connected socket
  const selfEnvelope: WsEnvelope<UserOnlinePayload> = {
    type: 'user:online',
    payload: {
      userId: socket.userId,
      username: socket.username,
    },
  };
  socket.send(JSON.stringify(selfEnvelope));

  // If this is the user's first active tab/connection, broadcast to everyone and update DB
  if (isFirstConnection) {
    logger.info(`User ${socket.username} (${socket.userId}) is now ONLINE`);

    // Broadcast user:online to all connected clients
    roomManager.broadcastAll(selfEnvelope, socket);

    // Update MySQL asynchronously without blocking the event loop
    prisma.user
      .update({
        where: { id: socket.userId },
        data: { isOnline: true },
      })
      .catch((err) => {
        logger.debug(`Could not update isOnline in DB (non-fatal): ${err.message}`);
      });
  }

  // Phase 40: Check and deliver any pending incoming calls to waking recipient
  checkPendingCallsForUser(socket);
}

/**
 * Handles disconnection, cleanup, and offline broadcast when all tabs close
 */
export async function handleUserDisconnect(socket: AuthenticatedWebSocket): Promise<void> {
  // Phase 39: Clean up active call sessions immediately upon socket disconnection
  try {
    await handleSocketDisconnectForCalls(socket);
  } catch (err) {
    logger.error(`Call disconnect cleanup error for user ${socket.userId}:`, err);
  }

  // Remove socket from all rooms and user sockets map
  roomManager.leaveAll(socket);

  // Check if the user still has other open tabs/devices
  const stillOnline = roomManager.isUserOnline(socket.userId);

  if (!stillOnline) {
    const lastSeenDate = new Date();
    const lastSeenIso = lastSeenDate.toISOString();

    logger.info(`User ${socket.username} (${socket.userId}) is now OFFLINE (lastSeen: ${lastSeenIso})`);

    // Broadcast user:offline to all remaining connected clients
    const offlineEnvelope: WsEnvelope<UserOfflinePayload> = {
      type: 'user:offline',
      payload: {
        userId: socket.userId,
        lastSeen: lastSeenIso,
      },
    };
    roomManager.broadcastAll(offlineEnvelope);

    // Update MySQL asynchronously
    prisma.user
      .update({
        where: { id: socket.userId },
        data: {
          isOnline: false,
          lastSeen: lastSeenDate,
        },
      })
      .catch((err) => {
        logger.debug(`Could not update lastSeen in DB (non-fatal): ${err.message}`);
      });
  }
}
