import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { kickUserSockets } from '../handlers/kickHandler.js';
import { logger } from '../lib/logger.js';

export interface InternalKickBody {
  userId: string;
  reason?: string;
  suspendedUntil?: string | null;
}

export async function internalKickRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/internal/kick',
    async (request: FastifyRequest<{ Body: InternalKickBody }>, reply: FastifyReply) => {
      const { userId, reason, suspendedUntil } = request.body || {};

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required for account kick' });
      }

      const kickReason = reason || 'Your account has been suspended by an administrator.';
      const count = kickUserSockets(userId, kickReason, suspendedUntil);

      logger.info(`[internalKick] Disconnected ${count} active socket(s) for user ${userId}`);

      return reply.send({
        success: true,
        userId,
        kickedSockets: count,
        reason: kickReason,
        suspendedUntil: suspendedUntil || null,
      });
    }
  );
}
