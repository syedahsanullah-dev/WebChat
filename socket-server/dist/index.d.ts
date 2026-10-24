import type { IncomingMessage } from 'http';
export declare const fastify: import("fastify").FastifyInstance<import("http").Server<typeof IncomingMessage, typeof import("http").ServerResponse>, IncomingMessage, import("http").ServerResponse<IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault> & PromiseLike<import("fastify").FastifyInstance<import("http").Server<typeof IncomingMessage, typeof import("http").ServerResponse>, IncomingMessage, import("http").ServerResponse<IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>>;
export declare const wss: import("ws").Server<typeof import("ws"), typeof IncomingMessage>;
export declare function startServer(): Promise<void>;
