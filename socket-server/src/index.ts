import type { IncomingMessage } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { logger } from './lib/logger.js';
import { roomManager, AuthenticatedWebSocket } from './lib/roomManager.js';
import { authenticateUpgrade } from './middleware/auth.js';
import { handleUserConnect, handleUserDisconnect } from './handlers/presenceHandler.js';
import { handleInternalCallReject } from './handlers/callSignalingHandler.js';
import { routeWebSocketEnvelope } from './router.js';
import { prisma } from './lib/prisma.js';
import { WsEnvelope } from './types/index.js';
import { maintenanceManager } from './middleware/maintenanceGuard.js';
import { startReminderScheduler, stopReminderScheduler } from './jobs/reminderSchedulerJob.js';
import { startLiveLocationCleanupJob, stopLiveLocationCleanupJob } from './jobs/liveLocationCleanupJob.js';
import { startEphemeralCleanupJob, stopEphemeralCleanupJob } from './jobs/ephemeralCleanupJob.js';
import { internalKickRoutes } from './routes/internalKick.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '25000', 10);

export const fastify = Fastify({
  logger: false, // We use Winston logger
});

// Register plugins
fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

fastify.register(cookie);
fastify.register(internalKickRoutes);

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    service: 'webchat-socket-server',
    server: 'Fastify + Native ws',
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
    uptime: Math.round(process.uptime()),
    activeConnections: roomManager.getActiveSocketCount ? roomManager.getActiveSocketCount() : wss.clients.size,
    onlineUsers: roomManager.getOnlineUserCount(),
    activeRooms: roomManager.getActiveRoomCount(),
    timestamp: new Date().toISOString(),
  };
});

// Metrics endpoint (consumed by Server #1 Admin console)
fastify.get('/metrics', async () => {
  const memory = process.memoryUsage();
  return {
    status: 'HEALTHY',
    uptime: Math.round(process.uptime()),
    activeSockets: roomManager.getActiveSocketCount ? roomManager.getActiveSocketCount() : 0,
    onlineUsers: roomManager.getOnlineUserCount ? roomManager.getOnlineUserCount() : 0,
    activeRooms: roomManager.getActiveRoomCount ? roomManager.getActiveRoomCount() : 0,
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
fastify.get('/', async () => {
  return {
    name: 'webchat-socket-server',
    status: 'running',
    version: '1.0.0',
    documentation: '/health',
  };
});

// Phase 35: Internal Global Broadcast Dispatcher (triggered by Server #1)
fastify.post('/internal/broadcast', async (request, reply) => {
  const payload = request.body as any;
  if (!payload || !payload.message) {
    return reply.status(400).send({ error: 'Message payload is required' });
  }

  const broadcastEnvelope: WsEnvelope = {
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

  roomManager.broadcastAll(broadcastEnvelope);
  logger.info(`📢 System broadcast dispatched to all connected clients: ${payload.message}`);

  return {
    success: true,
    deliveredSockets: roomManager.getActiveSocketCount ? roomManager.getActiveSocketCount() : 0,
  };
});

// Phase 35: Dismiss Global Broadcast Dispatcher
fastify.post('/internal/broadcast/dismiss', async (request, reply) => {
  const payload = request.body as any;
  const dismissEnvelope: WsEnvelope = {
    type: 'system:broadcast_dismiss',
    payload: {
      id: payload?.id,
    },
  };

  roomManager.broadcastAll(dismissEnvelope);
  logger.info(`📢 System broadcast dismiss dispatched: ${payload?.id}`);

  return { success: true };
});

// Phase 40: Internal Call Reject Route (triggered by Server #1 /api/calls/reject from Service Worker decline)
fastify.post('/internal/call-reject', async (request, reply) => {
  const body = request.body as any;
  const callId = body?.callId;
  const reason = body?.reason || 'declined';
  if (!callId) {
    return reply.status(400).send({ error: 'callId is required' });
  }
  const handled = await handleInternalCallReject(callId, reason);
  return reply.send({ success: true, handled, callId });
});

// Phase 36: Internal Maintenance Mode Manager
fastify.post('/internal/maintenance', async (request) => {
  const body = request.body as any;
  maintenanceManager.setState({
    enabled: Boolean(body?.enabled),
    reason: body?.reason || null,
    estimatedEnd: body?.estimatedEnd || null,
  });

  if (body?.enabled) {
    maintenanceManager.enforceMaintenanceKicks(wss);
  }

  // Real-time broadcast maintenance state to all connected clients
  roomManager.broadcastAll({
    type: 'system:maintenance',
    payload: maintenanceManager.getState(),
  });

  return { success: true, state: maintenanceManager.getState() };
});

fastify.get('/internal/maintenance', async () => {
  return { success: true, state: maintenanceManager.getState() };
});

// Phase 25/26: Internal Message Broadcast Dispatcher (triggered by webhooks, slash commands, or bots)
fastify.post('/internal/message', async (request, reply) => {
  const body = request.body as any;
  if (!body || !body.chatId || !body.message) {
    return reply.status(400).send({ error: 'chatId and message are required' });
  }

  const envelope: WsEnvelope = {
    type: 'message:new',
    payload: body.message,
  };

  roomManager.broadcastToRoom(`chat:${body.chatId}`, envelope);
  logger.info(`💬 Internal message broadcast dispatched to chat:${body.chatId} [type: ${body.message.messageType || 'text'}]`);

  return { success: true, deliveredRoom: `chat:${body.chatId}` };
});

// Phase 33: Internal Moderation Action Endpoints
fastify.post('/internal/mute', async (request, reply) => {
  const { userId, mutedUntil, reason } = (request.body || {}) as any;
  if (!userId || !mutedUntil) return reply.status(400).send({ error: 'userId and mutedUntil are required' });
  roomManager.sendToUser(userId, {
    type: 'user:mute',
    payload: { userId, mutedUntil, reason: reason || 'Muted by moderation' },
  });
  logger.info(`User ${userId} muted until ${mutedUntil}`);
  return { success: true };
});

fastify.post('/internal/warn', async (request, reply) => {
  const { userId, reason, reportId } = (request.body || {}) as any;
  if (!userId || !reason) return reply.status(400).send({ error: 'userId and reason are required' });
  roomManager.sendToUser(userId, {
    type: 'user:warn',
    payload: { userId, reason, reportId },
  });
  logger.info(`Moderation warning dispatched to user ${userId}`);
  return { success: true };
});

fastify.post('/internal/delete-message', async (request, reply) => {
  const { messageId, chatId, deletedBy } = (request.body || {}) as any;
  if (!messageId || !chatId) return reply.status(400).send({ error: 'messageId and chatId are required' });
  const deleteEnvelope = {
    type: 'message:delete',
    payload: {
      messageId,
      chatId,
      deletedBy: deletedBy || 'Moderator',
    },
  };
  roomManager.broadcastToRoom(`chat:${chatId}`, deleteEnvelope);
  roomManager.broadcastToRoom(chatId, deleteEnvelope);
  return { success: true };
});


// Native ws WebSocketServer mounted with manual upgrade handling
export const wss = new WebSocketServer({ noServer: true });

// Attach upgrade listener to fastify.server
fastify.server.on('upgrade', (request, socket, head) => {
  const user = authenticateUpgrade(request, socket, JWT_SECRET);
  if (!user) return;

  // Phase 36: Reject non-admin connections during Maintenance Mode with 503
  if (maintenanceManager.isMaintenanceActive() && !maintenanceManager.isUserAdmin(user.systemRole)) {
    logger.warn(`Maintenance guard: rejecting WebSocket upgrade for non-admin user ${user.userId}`);
    socket.write(
      'HTTP/1.1 503 Service Unavailable\r\n' +
      'Content-Type: text/plain\r\n' +
      'Connection: close\r\n\r\n' +
      'System Maintenance Active\n'
    );
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, user);
  });
});

// WebSocket Connection handler
wss.on('connection', (ws: WebSocket, _req: IncomingMessage, user?: { userId: string; username: string; systemRole?: string }) => {
  const authWs = ws as AuthenticatedWebSocket;
  const userInfo = user || { userId: 'anonymous', username: 'anonymous' };
  authWs.userId = userInfo.userId;
  authWs.username = userInfo.username;
  authWs.systemRole = userInfo.systemRole || 'USER';
  authWs.isAlive = true;
  authWs.rooms = new Set<string>();

  // Process connect presence lifecycle and online broadcast
  handleUserConnect(authWs).catch((err) => {
    logger.error(`Presence connect error for user ${authWs.userId}:`, err);
  });

  authWs.on('pong', () => {
    authWs.isAlive = true;
  });

  authWs.on('message', (rawData) => {
    // Phase 41: Keep-alive hardening to prevent Hostinger reverse proxy timeout
    authWs.isAlive = true;
    try {
      const data = JSON.parse(rawData.toString()) as WsEnvelope;
      routeWebSocketEnvelope(authWs, data);
    } catch (err) {
      logger.warn(`Malformed message from user ${authWs.userId}: ${(err as Error).message}`);
    }
  });

  authWs.on('close', () => {
    handleUserDisconnect(authWs).catch((err) => {
      logger.error(`Presence disconnect error for user ${authWs.userId}:`, err);
    });
  });

  authWs.on('error', (err) => {
    logger.error(`WebSocket error for user ${authWs.userId}:`, err);
  });
});

// Ping-pong heartbeat monitor (30s default)
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const authWs = client as AuthenticatedWebSocket;
    if (!authWs.isAlive) {
      logger.info(`Terminating unresponsive WebSocket for user: ${authWs.userId}`);
      return authWs.terminate();
    }
    authWs.isAlive = false;
    authWs.ping();
  });
}, PING_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Server bootstrap
export async function startServer(): Promise<void> {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    logger.info(`🚀 Fastify + Native WS daemon running on http://${HOST}:${PORT}`);
    logger.info(`Health check available at http://${HOST}:${PORT}/health`);

    // Reset online status on server boot so stale crashes don't leave users permanently online
    prisma.user
      .updateMany({ data: { isOnline: false } })
      .catch((err) => logger.debug(`Startup presence reset non-fatal: ${err.message}`));

    // Start Phase 26 background reminder scheduler
    startReminderScheduler();
    // Start Phase 38 live location auto-expiration background daemon
    startLiveLocationCleanupJob();
    // Start Phase 22 ephemeral auto-purge background daemon
    startEphemeralCleanupJob();
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down socket server...');
  stopReminderScheduler();
  stopLiveLocationCleanupJob();
  stopEphemeralCleanupJob();
  clearInterval(heartbeatInterval);
  wss.close();
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Auto-start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Startup error:', err);
  });
}
