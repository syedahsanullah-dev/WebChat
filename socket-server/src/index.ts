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
import { routeWebSocketEnvelope } from './router.js';
import { prisma } from './lib/prisma.js';
import { WsEnvelope } from './types/index.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '30000', 10);

export const fastify = Fastify({
  logger: false, // We use Winston logger
});

// Register plugins
fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

fastify.register(cookie);

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

// Metrics telemetry endpoint (consumed by Server #1 Super Admin console)
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

// Native ws WebSocketServer mounted with manual upgrade handling
export const wss = new WebSocketServer({ noServer: true });

// Attach upgrade listener to fastify.server
fastify.server.on('upgrade', (request, socket, head) => {
  const user = authenticateUpgrade(request, socket, JWT_SECRET);
  if (!user) return;

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, user);
  });
});

// WebSocket Connection handler
wss.on('connection', (ws: WebSocket, _req: IncomingMessage, user?: { userId: string; username: string }) => {
  const authWs = ws as AuthenticatedWebSocket;
  const userInfo = user || { userId: 'anonymous', username: 'anonymous' };
  authWs.userId = userInfo.userId;
  authWs.username = userInfo.username;
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
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down socket server...');
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
