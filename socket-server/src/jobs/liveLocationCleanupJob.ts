import { prisma } from '../lib/prisma.js';
import { roomManager } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';

let cleanupInterval: NodeJS.Timeout | null = null;

export function startLiveLocationCleanupJob(intervalMs: number = 60000): void {
  if (cleanupInterval) return;

  logger.info(`Starting Live Location auto-expiration daemon (every ${intervalMs / 1000}s)`);

  cleanupInterval = setInterval(async () => {
    try {
      const now = new Date();
      const expiredLocations = await prisma.liveLocation.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          chatId: true,
          userId: true,
        },
      });

      if (expiredLocations.length === 0) return;

      // Deactivate all expired sessions in one batch
      await prisma.liveLocation.updateMany({
        where: {
          id: {
            in: expiredLocations.map((l) => l.id),
          },
        },
        data: {
          isActive: false,
        },
      });

      // Broadcast termination event to each affected chat room
      for (const loc of expiredLocations) {
        const endedEnvelope = {
          type: 'location:live_ended',
          payload: {
            liveLocationId: loc.id,
            chatId: loc.chatId,
            userId: loc.userId,
            reason: 'expired',
          },
        };
        roomManager.broadcastToRoom(`chat:${loc.chatId}`, endedEnvelope);
        roomManager.broadcastToRoom(loc.chatId, endedEnvelope);
      }

      logger.info(`Live location cleanup daemon deactivated ${expiredLocations.length} expired session(s)`);
    } catch (err) {
      logger.error('Error executing live location auto-expiration cleanup job:', err);
    }
  }, intervalMs);
}

export function stopLiveLocationCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
