import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AuditAction } from '@shared/types';

export interface RecordAuditParams {
  userId?: string | null;
  actorId?: string | null;
  action: AuditAction | string;
  resource?: string;
  entityType?: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  details?: any;
}

/**
 * Appends an immutable security audit log event to the database.
 * Failsafe and non-blocking: logs warnings on database failures without crashing business logic.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<void> {
  const finalUserId = params.userId || params.actorId || null;
  const finalResource = params.resource || params.entityType || 'SYSTEM';
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
    logger.warn(`Failed to write audit log [${params.action}]: ${err?.message || err}`);
  }
}
