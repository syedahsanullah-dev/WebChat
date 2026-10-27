import { prisma } from './prisma';
import { logger } from './logger';

export interface SocketAuditParams {
  userId?: string | null;
  actorId?: string | null;
  action: string;
  resource?: string;
  entityType?: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  details?: any;
}

export async function recordSocketAuditLog(params: SocketAuditParams): Promise<void> {
  const finalUserId = params.userId || params.actorId || null;
  const finalResource = params.resource || params.entityType || 'SOCKET';
  const metaObj = params.metadata || params.details || null;
  const finalMeta = metaObj ? (typeof metaObj === 'string' ? metaObj : JSON.stringify(metaObj)) : null;

  try {
    await prisma.auditLog.create({
      data: {
        userId: finalUserId,
        action: params.action,
        resource: finalResource,
        entityId: params.entityId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: finalMeta,
      },
    });
  } catch (err: any) {
    logger.warn(`Failed to record socket audit log [${params.action}]: ${err?.message || err}`);
  }
}
