"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSocketAuditLog = recordSocketAuditLog;
const prisma_1 = require("./prisma");
const logger_1 = require("./logger");
async function recordSocketAuditLog(params) {
    const finalUserId = params.userId || params.actorId || null;
    const finalResource = params.resource || params.entityType || 'SOCKET';
    const metaObj = params.metadata || params.details || null;
    const finalMeta = metaObj ? (typeof metaObj === 'string' ? metaObj : JSON.stringify(metaObj)) : null;
    try {
        await prisma_1.prisma.auditLog.create({
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
    }
    catch (err) {
        logger_1.logger.warn(`Failed to record socket audit log [${params.action}]: ${err?.message || err}`);
    }
}
