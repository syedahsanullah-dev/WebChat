import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { roomManager } from '../lib/roomManager.js';
import { logger } from '../lib/logger.js';
import { WsEnvelope } from '../types/index.js';

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Resolves local file path on Hostinger NVMe disk for a given media URL.
 */
function resolveMediaDiskPath(mediaUrl: string): string | null {
  if (!mediaUrl) return null;
  const cleanUrl = mediaUrl.replace(/^\/+/, '');

  const candidatePaths = [
    path.resolve(process.cwd(), '../web/public', cleanUrl),
    path.resolve(process.cwd(), 'public', cleanUrl),
    path.resolve(process.cwd(), cleanUrl),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to primary web public path
  return candidatePaths[0];
}

/**
 * 24/7 background ephemeral cleanup daemon running every 15 minutes.
 * Permanently purges expired messages and deletes local NVMe disk media files,
 * respecting active Legal Hold governance.
 */
export function startEphemeralCleanupJob(intervalMs: number = 900000): void {
  if (cleanupInterval) return;

  logger.info(`🧹 Starting Ephemeral Messages auto-purge daemon (every ${intervalMs / 1000}s)`);

  cleanupInterval = setInterval(async () => {
    try {
      const now = new Date();

      // Find expired messages whose chats are NOT under compliance legal hold
      const expiredMessages = await prisma.message.findMany({
        where: {
          expiresAt: { lte: now },
          chat: { isLegalHold: false }, // Enforce Legal Hold compliance bypass
        },
        select: {
          id: true,
          chatId: true,
          mediaUrl: true,
        },
        take: 100,
      });

      if (!expiredMessages || expiredMessages.length === 0) {
        return;
      }

      logger.info(`🧹 Ephemeral daemon found ${expiredMessages.length} expired messages to purge...`);

      // 1. Safely unlink associated media attachments from local NVMe storage
      for (const msg of expiredMessages) {
        if (msg.mediaUrl) {
          try {
            const diskPath = resolveMediaDiskPath(msg.mediaUrl);
            if (diskPath && fs.existsSync(diskPath)) {
              await fs.promises.unlink(diskPath);
              logger.debug(`🧹 Purged expired disk file: ${diskPath}`);
            }
          } catch (fileErr: any) {
            logger.debug(`Could not unlink media for message ${msg.id}: ${fileErr.message}`);
          }
        }
      }

      // 2. Batch delete expired message records from MySQL
      const messageIds = expiredMessages.map((m) => m.id);
      await prisma.message.deleteMany({
        where: { id: { in: messageIds } },
      });

      logger.info(`🧹 Successfully deleted ${messageIds.length} expired message records from database`);

      // 3. Group by chat and broadcast message:delete over WebSockets
      const messagesByChat = new Map<string, string[]>();
      for (const msg of expiredMessages) {
        const list = messagesByChat.get(msg.chatId) || [];
        list.push(msg.id);
        messagesByChat.set(msg.chatId, list);
      }

      for (const [chatId, ids] of messagesByChat.entries()) {
        const deleteEnvelope: WsEnvelope = {
          type: 'message:delete',
          payload: {
            messageIds: ids,
            messageId: ids[0],
            chatId,
            deleteType: 'everyone',
          },
        };
        roomManager.broadcastToRoom(`chat:${chatId}`, deleteEnvelope);
      }
    } catch (err: any) {
      logger.error(`Error during ephemeral cleanup job run: ${err?.message || err}`);
    }
  }, intervalMs);
}

export function stopEphemeralCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Ephemeral cleanup daemon stopped');
  }
}
