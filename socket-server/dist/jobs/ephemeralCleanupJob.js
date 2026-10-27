"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEphemeralCleanupJob = startEphemeralCleanupJob;
exports.stopEphemeralCleanupJob = stopEphemeralCleanupJob;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_js_1 = require("../lib/prisma.js");
const roomManager_js_1 = require("../lib/roomManager.js");
const logger_js_1 = require("../lib/logger.js");
let cleanupInterval = null;
/**
 * Resolves local file path on disk for a given media URL.
 */
function resolveMediaDiskPath(mediaUrl) {
    if (!mediaUrl)
        return null;
    const cleanUrl = mediaUrl.replace(/^\/+/, '');
    const candidatePaths = [
        path_1.default.resolve(process.cwd(), '../web/public', cleanUrl),
        path_1.default.resolve(process.cwd(), 'public', cleanUrl),
        path_1.default.resolve(process.cwd(), cleanUrl),
    ];
    for (const candidate of candidatePaths) {
        if (fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    // Fallback to primary web public path
    return candidatePaths[0];
}
/**
 * 24/7 background ephemeral cleanup daemon running every 15 minutes.
 * Permanently purges expired messages and deletes local disk media files,
 * respecting active Legal Hold status.
 */
function startEphemeralCleanupJob(intervalMs = 900000) {
    if (cleanupInterval)
        return;
    logger_js_1.logger.info(`🧹 Starting Ephemeral Messages auto-purge daemon (every ${intervalMs / 1000}s)`);
    cleanupInterval = setInterval(async () => {
        try {
            const now = new Date();
            // Find expired messages whose chats are NOT under compliance legal hold
            const expiredMessages = await prisma_js_1.prisma.message.findMany({
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
            logger_js_1.logger.info(`🧹 Ephemeral daemon found ${expiredMessages.length} expired messages to purge...`);
            // 1. Safely unlink associated media attachments from local NVMe storage
            for (const msg of expiredMessages) {
                if (msg.mediaUrl) {
                    try {
                        const diskPath = resolveMediaDiskPath(msg.mediaUrl);
                        if (diskPath && fs_1.default.existsSync(diskPath)) {
                            await fs_1.default.promises.unlink(diskPath);
                            logger_js_1.logger.debug(`🧹 Purged expired disk file: ${diskPath}`);
                        }
                    }
                    catch (fileErr) {
                        logger_js_1.logger.debug(`Could not unlink media for message ${msg.id}: ${fileErr.message}`);
                    }
                }
            }
            // 2. Batch delete expired message records from MySQL
            const messageIds = expiredMessages.map((m) => m.id);
            await prisma_js_1.prisma.message.deleteMany({
                where: { id: { in: messageIds } },
            });
            logger_js_1.logger.info(`🧹 Successfully deleted ${messageIds.length} expired message records from database`);
            // 3. Group by chat and broadcast message:delete over WebSockets
            const messagesByChat = new Map();
            for (const msg of expiredMessages) {
                const list = messagesByChat.get(msg.chatId) || [];
                list.push(msg.id);
                messagesByChat.set(msg.chatId, list);
            }
            for (const [chatId, ids] of messagesByChat.entries()) {
                const deleteEnvelope = {
                    type: 'message:delete',
                    payload: {
                        messageIds: ids,
                        messageId: ids[0],
                        chatId,
                        deleteType: 'everyone',
                    },
                };
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, deleteEnvelope);
            }
        }
        catch (err) {
            logger_js_1.logger.error(`Error during ephemeral cleanup job run: ${err?.message || err}`);
        }
    }, intervalMs);
}
function stopEphemeralCleanupJob() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger_js_1.logger.info('Ephemeral cleanup daemon stopped');
    }
}
