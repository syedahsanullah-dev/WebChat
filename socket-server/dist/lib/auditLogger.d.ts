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
export declare function recordSocketAuditLog(params: SocketAuditParams): Promise<void>;
