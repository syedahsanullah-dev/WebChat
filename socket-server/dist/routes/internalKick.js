"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalKickRoutes = internalKickRoutes;
const kickHandler_js_1 = require("../handlers/kickHandler.js");
const logger_js_1 = require("../lib/logger.js");
async function internalKickRoutes(fastify) {
    fastify.post('/internal/kick', async (request, reply) => {
        const { userId, reason, suspendedUntil } = request.body || {};
        if (!userId) {
            return reply.status(400).send({ error: 'userId is required for account kick' });
        }
        const kickReason = reason || 'Your account has been suspended by an administrator.';
        const count = (0, kickHandler_js_1.kickUserSockets)(userId, kickReason, suspendedUntil);
        logger_js_1.logger.info(`[internalKick] Disconnected ${count} active socket(s) for user ${userId}`);
        return reply.send({
            success: true,
            userId,
            kickedSockets: count,
            reason: kickReason,
            suspendedUntil: suspendedUntil || null,
        });
    });
}
