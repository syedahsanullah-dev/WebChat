"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = exports.fastify = void 0;
exports.startServer = startServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_js_1 = require("./lib/logger.js");
const roomManager_js_1 = require("./lib/roomManager.js");
const auth_js_1 = require("./middleware/auth.js");
const presenceHandler_js_1 = require("./handlers/presenceHandler.js");
const callSignalingHandler_js_1 = require("./handlers/callSignalingHandler.js");
const router_js_1 = require("./router.js");
const prisma_js_1 = require("./lib/prisma.js");
const maintenanceGuard_js_1 = require("./middleware/maintenanceGuard.js");
const reminderSchedulerJob_js_1 = require("./jobs/reminderSchedulerJob.js");
const liveLocationCleanupJob_js_1 = require("./jobs/liveLocationCleanupJob.js");
const ephemeralCleanupJob_js_1 = require("./jobs/ephemeralCleanupJob.js");
const internalKick_js_1 = require("./routes/internalKick.js");
// Load environment variables
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '25000', 10);
exports.fastify = (0, fastify_1.default)({
    logger: false, // We use Winston logger
});
// Register plugins
exports.fastify.register(cors_1.default, {
    origin: CORS_ORIGIN,
    credentials: true,
});
exports.fastify.register(cookie_1.default);
exports.fastify.register(internalKick_js_1.internalKickRoutes);
// Health check endpoint
exports.fastify.get('/health', async () => {
    return {
        status: 'ok',
        service: 'webchat-socket-server',
        server: 'Fastify + Native ws',
        memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime()),
        uptime: Math.round(process.uptime()),
        activeConnections: roomManager_js_1.roomManager.getActiveSocketCount ? roomManager_js_1.roomManager.getActiveSocketCount() : exports.wss.clients.size,
        onlineUsers: roomManager_js_1.roomManager.getOnlineUserCount(),
        activeRooms: roomManager_js_1.roomManager.getActiveRoomCount(),
        timestamp: new Date().toISOString(),
    };
});
// Metrics endpoint (consumed by Server #1 Admin console)
exports.fastify.get('/metrics', async () => {
    const memory = process.memoryUsage();
    return {
        status: 'HEALTHY',
        uptime: Math.round(process.uptime()),
        activeSockets: roomManager_js_1.roomManager.getActiveSocketCount ? roomManager_js_1.roomManager.getActiveSocketCount() : 0,
        onlineUsers: roomManager_js_1.roomManager.getOnlineUserCount ? roomManager_js_1.roomManager.getOnlineUserCount() : 0,
        activeRooms: roomManager_js_1.roomManager.getActiveRoomCount ? roomManager_js_1.roomManager.getActiveRoomCount() : 0,
        memory: {
            rssMB: Math.round(memory.rss / 1024 / 1024),
            heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
            externalMB: Math.round(memory.external / 1024 / 1024),
        },
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
    };
});
// Root welcome endpoint
exports.fastify.get('/', async () => {
    return {
        name: 'webchat-socket-server',
        status: 'running',
        version: '1.0.0',
        documentation: '/health',
    };
});
// Phase 35: Internal Global Broadcast Dispatcher (triggered by Server #1)
exports.fastify.post('/internal/broadcast', async (request, reply) => {
    const payload = request.body;
    if (!payload || !payload.message) {
        return reply.status(400).send({ error: 'Message payload is required' });
    }
    const broadcastEnvelope = {
        type: 'system:broadcast',
        payload: {
            id: payload.id || `bcast-${Date.now()}`,
            message: payload.message,
            severity: payload.severity || 'INFO',
            createdAt: payload.createdAt || new Date().toISOString(),
            expiresAt: payload.expiresAt || null,
            creatorName: payload.creatorName || 'System Administrator',
        },
    };
    roomManager_js_1.roomManager.broadcastAll(broadcastEnvelope);
    logger_js_1.logger.info(`📢 System broadcast dispatched to all connected clients: ${payload.message}`);
    return {
        success: true,
        deliveredSockets: roomManager_js_1.roomManager.getActiveSocketCount ? roomManager_js_1.roomManager.getActiveSocketCount() : 0,
    };
});
// Phase 35: Dismiss Global Broadcast Dispatcher
exports.fastify.post('/internal/broadcast/dismiss', async (request, reply) => {
    const payload = request.body;
    const dismissEnvelope = {
        type: 'system:broadcast_dismiss',
        payload: {
            id: payload?.id,
        },
    };
    roomManager_js_1.roomManager.broadcastAll(dismissEnvelope);
    logger_js_1.logger.info(`📢 System broadcast dismiss dispatched: ${payload?.id}`);
    return { success: true };
});
// Phase 40: Internal Call Reject Route (triggered by Server #1 /api/calls/reject from Service Worker decline)
exports.fastify.post('/internal/call-reject', async (request, reply) => {
    const body = request.body;
    const callId = body?.callId;
    const reason = body?.reason || 'declined';
    if (!callId) {
        return reply.status(400).send({ error: 'callId is required' });
    }
    const handled = await (0, callSignalingHandler_js_1.handleInternalCallReject)(callId, reason);
    return reply.send({ success: true, handled, callId });
});
// Phase 36: Internal Maintenance Mode Manager
exports.fastify.post('/internal/maintenance', async (request) => {
    const body = request.body;
    maintenanceGuard_js_1.maintenanceManager.setState({
        enabled: Boolean(body?.enabled),
        reason: body?.reason || null,
        estimatedEnd: body?.estimatedEnd || null,
    });
    if (body?.enabled) {
        maintenanceGuard_js_1.maintenanceManager.enforceMaintenanceKicks(exports.wss);
    }
    // Real-time broadcast maintenance state to all connected clients
    roomManager_js_1.roomManager.broadcastAll({
        type: 'system:maintenance',
        payload: maintenanceGuard_js_1.maintenanceManager.getState(),
    });
    return { success: true, state: maintenanceGuard_js_1.maintenanceManager.getState() };
});
exports.fastify.get('/internal/maintenance', async () => {
    return { success: true, state: maintenanceGuard_js_1.maintenanceManager.getState() };
});
// Phase 25/26: Internal Message Broadcast Dispatcher (triggered by webhooks, slash commands, or bots)
exports.fastify.post('/internal/message', async (request, reply) => {
    const body = request.body;
    if (!body || !body.chatId || !body.message) {
        return reply.status(400).send({ error: 'chatId and message are required' });
    }
    const envelope = {
        type: 'message:new',
        payload: body.message,
    };
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${body.chatId}`, envelope);
    logger_js_1.logger.info(`💬 Internal message broadcast dispatched to chat:${body.chatId} [type: ${body.message.messageType || 'text'}]`);
    return { success: true, deliveredRoom: `chat:${body.chatId}` };
});
// Phase 33: Internal Moderation Action Endpoints
exports.fastify.post('/internal/mute', async (request, reply) => {
    const { userId, mutedUntil, reason } = (request.body || {});
    if (!userId || !mutedUntil)
        return reply.status(400).send({ error: 'userId and mutedUntil are required' });
    roomManager_js_1.roomManager.sendToUser(userId, {
        type: 'user:mute',
        payload: { userId, mutedUntil, reason: reason || 'Muted by moderation' },
    });
    logger_js_1.logger.info(`User ${userId} muted until ${mutedUntil}`);
    return { success: true };
});
exports.fastify.post('/internal/warn', async (request, reply) => {
    const { userId, reason, reportId } = (request.body || {});
    if (!userId || !reason)
        return reply.status(400).send({ error: 'userId and reason are required' });
    roomManager_js_1.roomManager.sendToUser(userId, {
        type: 'user:warn',
        payload: { userId, reason, reportId },
    });
    logger_js_1.logger.info(`Moderation warning dispatched to user ${userId}`);
    return { success: true };
});
exports.fastify.post('/internal/delete-message', async (request, reply) => {
    const { messageId, chatId, deletedBy } = (request.body || {});
    if (!messageId || !chatId)
        return reply.status(400).send({ error: 'messageId and chatId are required' });
    const deleteEnvelope = {
        type: 'message:delete',
        payload: {
            messageId,
            chatId,
            deletedBy: deletedBy || 'Moderator',
        },
    };
    roomManager_js_1.roomManager.broadcastToRoom(`chat:${chatId}`, deleteEnvelope);
    roomManager_js_1.roomManager.broadcastToRoom(chatId, deleteEnvelope);
    return { success: true };
});
// Native ws WebSocketServer mounted with manual upgrade handling
exports.wss = new ws_1.WebSocketServer({ noServer: true });
// Attach upgrade listener to fastify.server
exports.fastify.server.on('upgrade', (request, socket, head) => {
    const user = (0, auth_js_1.authenticateUpgrade)(request, socket, JWT_SECRET);
    if (!user)
        return;
    // Phase 36: Reject non-admin connections during Maintenance Mode with 503
    if (maintenanceGuard_js_1.maintenanceManager.isMaintenanceActive() && !maintenanceGuard_js_1.maintenanceManager.isUserAdmin(user.systemRole)) {
        logger_js_1.logger.warn(`Maintenance guard: rejecting WebSocket upgrade for non-admin user ${user.userId}`);
        socket.write('HTTP/1.1 503 Service Unavailable\r\n' +
            'Content-Type: text/plain\r\n' +
            'Connection: close\r\n\r\n' +
            'System Maintenance Active\n');
        socket.destroy();
        return;
    }
    exports.wss.handleUpgrade(request, socket, head, (ws) => {
        exports.wss.emit('connection', ws, request, user);
    });
});
// WebSocket Connection handler
exports.wss.on('connection', (ws, _req, user) => {
    const authWs = ws;
    const userInfo = user || { userId: 'anonymous', username: 'anonymous' };
    authWs.userId = userInfo.userId;
    authWs.username = userInfo.username;
    authWs.systemRole = userInfo.systemRole || 'USER';
    authWs.isAlive = true;
    authWs.rooms = new Set();
    // Process connect presence lifecycle and online broadcast
    (0, presenceHandler_js_1.handleUserConnect)(authWs).catch((err) => {
        logger_js_1.logger.error(`Presence connect error for user ${authWs.userId}:`, err);
    });
    authWs.on('pong', () => {
        authWs.isAlive = true;
    });
    authWs.on('message', (rawData) => {
        // Phase 41: Keep-alive hardening to prevent Hostinger reverse proxy timeout
        authWs.isAlive = true;
        try {
            const data = JSON.parse(rawData.toString());
            (0, router_js_1.routeWebSocketEnvelope)(authWs, data);
        }
        catch (err) {
            logger_js_1.logger.warn(`Malformed message from user ${authWs.userId}: ${err.message}`);
        }
    });
    authWs.on('close', () => {
        (0, presenceHandler_js_1.handleUserDisconnect)(authWs).catch((err) => {
            logger_js_1.logger.error(`Presence disconnect error for user ${authWs.userId}:`, err);
        });
    });
    authWs.on('error', (err) => {
        logger_js_1.logger.error(`WebSocket error for user ${authWs.userId}:`, err);
    });
});
// Ping-pong heartbeat monitor (30s default)
const heartbeatInterval = setInterval(() => {
    exports.wss.clients.forEach((client) => {
        const authWs = client;
        if (!authWs.isAlive) {
            logger_js_1.logger.info(`Terminating unresponsive WebSocket for user: ${authWs.userId}`);
            return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
    });
}, PING_INTERVAL_MS);
exports.wss.on('close', () => {
    clearInterval(heartbeatInterval);
});
// Server bootstrap
async function startServer() {
    try {
        await exports.fastify.listen({ port: PORT, host: HOST });
        logger_js_1.logger.info(`🚀 Fastify + Native WS daemon running on http://${HOST}:${PORT}`);
        logger_js_1.logger.info(`Health check available at http://${HOST}:${PORT}/health`);
        // Reset online status on server boot so stale crashes don't leave users permanently online
        prisma_js_1.prisma.user
            .updateMany({ data: { isOnline: false } })
            .catch((err) => logger_js_1.logger.debug(`Startup presence reset non-fatal: ${err.message}`));
        // Start Phase 26 background reminder scheduler
        (0, reminderSchedulerJob_js_1.startReminderScheduler)();
        // Start Phase 38 live location auto-expiration background daemon
        (0, liveLocationCleanupJob_js_1.startLiveLocationCleanupJob)();
        // Start Phase 22 ephemeral auto-purge background daemon
        (0, ephemeralCleanupJob_js_1.startEphemeralCleanupJob)();
    }
    catch (err) {
        logger_js_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
}
// Graceful shutdown
const shutdown = async () => {
    logger_js_1.logger.info('Shutting down socket server...');
    (0, reminderSchedulerJob_js_1.stopReminderScheduler)();
    (0, liveLocationCleanupJob_js_1.stopLiveLocationCleanupJob)();
    (0, ephemeralCleanupJob_js_1.stopEphemeralCleanupJob)();
    clearInterval(heartbeatInterval);
    exports.wss.close();
    await exports.fastify.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Auto-start if executed directly
if (process.env.NODE_ENV !== 'test') {
    startServer().catch((err) => {
        logger_js_1.logger.error('Startup error:', err);
    });
}
