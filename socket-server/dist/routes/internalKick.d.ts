import { FastifyInstance } from 'fastify';
export interface InternalKickBody {
    userId: string;
    reason?: string;
    suspendedUntil?: string | null;
}
export declare function internalKickRoutes(fastify: FastifyInstance): Promise<void>;
