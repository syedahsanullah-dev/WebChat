"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLiveLocationCleanupJob = startLiveLocationCleanupJob;
exports.stopLiveLocationCleanupJob = stopLiveLocationCleanupJob;
const prisma_js_1 = require("../lib/prisma.js");
const roomManager_js_1 = require("../lib/roomManager.js");
const logger_js_1 = require("../lib/logger.js");
let cleanupInterval = null;
function startLiveLocationCleanupJob(intervalMs = 60000) {
    if (cleanupInterval)
        return;
    logger_js_1.logger.info(`Starting Live Location auto-expiration daemon (every ${intervalMs / 1000}s)`);
    cleanupInterval = setInterval(async () => {
        try {
            const now = new Date();
            const expiredLocations = await prisma_js_1.prisma.liveLocation.findMany({
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
            if (expiredLocations.length === 0)
                return;
            // Deactivate all expired sessions in one batch
            await prisma_js_1.prisma.liveLocation.updateMany({
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
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${loc.chatId}`, endedEnvelope);
                roomManager_js_1.roomManager.broadcastToRoom(loc.chatId, endedEnvelope);
            }
            logger_js_1.logger.info(`Live location cleanup daemon deactivated ${expiredLocations.length} expired session(s)`);
        }
        catch (err) {
            logger_js_1.logger.error('Error executing live location auto-expiration cleanup job:', err);
        }
    }, intervalMs);
}
function stopLiveLocationCleanupJob() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
