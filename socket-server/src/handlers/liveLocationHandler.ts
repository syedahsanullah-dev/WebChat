import { AuthenticatedWebSocket, roomManager } from '../lib/roomManager.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  LiveLocationStartPayload,
  LiveLocationUpdatePayload,
  LiveLocationStopPayload,
} from '../types/index.js';

export async function handleLiveLocationStart(
  socket: AuthenticatedWebSocket,
  payload: LiveLocationStartPayload
): Promise<void> {
  const { chatId, latitude, longitude, durationMinutes = 60, comment, heading, speed, accuracy } = payload;
  const userId = socket.userId;

  if (!chatId || typeof latitude !== 'number' || typeof longitude !== 'number') {
    logger.debug('Invalid location:live_start parameters');
    return;
  }

  try {
    const validMinutes = [15, 60, 480].includes(durationMinutes) ? durationMinutes : 60;
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000);

    // Deactivate previous active live location sessions for this user in this chat
    await prisma.liveLocation.updateMany({
      where: {
        chatId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const liveLocation = await prisma.liveLocation.create({
      data: {
        chatId,
        userId,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
        comment: comment ? String(comment).slice(0, 255) : null,
        isActive: true,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        messageType: 'live_location',
        content: comment || 'Live Location',
        latitude,
        longitude,
        locationAddress: comment || 'Live Location Sharing',
        liveLocationId: liveLocation.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update chat lastMessageAt
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    const formattedLiveLocation = {
      id: liveLocation.id,
      chatId: liveLocation.chatId,
      userId: liveLocation.userId,
      userDisplayName: liveLocation.user.displayName || liveLocation.user.username,
      userAvatarUrl: liveLocation.user.avatarUrl,
      latitude: liveLocation.latitude,
      longitude: liveLocation.longitude,
      heading: liveLocation.heading,
      speed: liveLocation.speed,
      accuracy: liveLocation.accuracy,
      comment: liveLocation.comment,
      isActive: liveLocation.isActive,
      startedAt: liveLocation.startedAt.toISOString(),
      expiresAt: liveLocation.expiresAt.toISOString(),
      updatedAt: liveLocation.updatedAt.toISOString(),
    };

    // Broadcast live location started to all connected chat participants
    const startedEnvelope = {
      type: 'location:live_started',
      payload: {
        liveLocation: formattedLiveLocation,
        message,
      },
    };
    roomManager.broadcastToRoom(`chat:${chatId}`, startedEnvelope);
    roomManager.broadcastToRoom(chatId, startedEnvelope);

    // Direct delivery to all online chat participants (ensures delivery even without room join)
    try {
      const participants = await prisma.chatParticipant.findMany({
        where: { chatId, userId: { not: userId } },
        select: { userId: true },
      });
      participants.forEach((p) => {
        if (roomManager.isUserOnline(p.userId)) {
          roomManager.sendToUser(p.userId, startedEnvelope);
        }
      });
    } catch (partErr) {
      logger.debug(`Could not look up participants for live location notification: ${(partErr as Error).message}`);
    }

    logger.info(`Live location started by user ${userId} in chat ${chatId} (${validMinutes}m)`);
  } catch (error) {
    logger.error('Failed to handle location:live_start:', error);
  }
}

export async function handleLiveLocationUpdate(
  socket: AuthenticatedWebSocket,
  payload: LiveLocationUpdatePayload
): Promise<void> {
  const { liveLocationId, chatId, latitude, longitude, heading, speed, accuracy } = payload;
  const userId = socket.userId;

  if (!liveLocationId || !chatId || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return;
  }

  const updatedAt = new Date().toISOString();

  // Sub-5ms fast-path WebSocket broadcast to all room participants
  const updateEnvelope = {
    type: 'location:live_updated',
    payload: {
      liveLocationId,
      chatId,
      userId,
      latitude,
      longitude,
      heading: heading ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
      updatedAt,
    },
  };
  roomManager.broadcastToRoom(`chat:${chatId}`, updateEnvelope);
  roomManager.broadcastToRoom(chatId, updateEnvelope);

  // Asynchronous MySQL coordinates update without blocking event loop
  prisma.liveLocation
    .update({
      where: { id: liveLocationId },
      data: {
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
      },
    })
    .catch((err) => {
      logger.error(`Error saving live location coordinates update ${liveLocationId}:`, err);
    });
}

export async function handleLiveLocationStop(
  socket: AuthenticatedWebSocket,
  payload: LiveLocationStopPayload
): Promise<void> {
  const { liveLocationId, chatId } = payload;
  const userId = socket.userId;

  if (!liveLocationId || !chatId) {
    return;
  }

  try {
    await prisma.liveLocation.updateMany({
      where: {
        id: liveLocationId,
        userId,
      },
      data: {
        isActive: false,
      },
    });

    const stopEnvelope = {
      type: 'location:live_stopped',
      payload: {
        liveLocationId,
        chatId,
        userId,
        reason: 'manual',
      },
    };
    roomManager.broadcastToRoom(`chat:${chatId}`, stopEnvelope);
    roomManager.broadcastToRoom(chatId, stopEnvelope);

    logger.info(`Live location stopped manually by user ${userId} (${liveLocationId})`);
  } catch (error) {
    logger.error(`Failed to stop live location ${liveLocationId}:`, error);
  }
}
