import type { IncomingMessage } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logger } from './lib/logger.js';
import { roomManager, AuthenticatedWebSocket } from './lib/roomManager.js';
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
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    onlineUsers: roomManager.getOnlineUserCount(),
    activeRooms: roomManager.getActiveRoomCount(),
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

// Native ws WebSocketServer mounted with manual upgrade handling
export const wss = new WebSocketServer({ noServer: true });

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const items = cookieHeader.split(';');
  for (const item of items) {
    const idx = item.indexOf('=');
    if (idx !== -1) {
      const key = item.slice(0, idx).trim();
      const val = item.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

// Attach upgrade listener to fastify.server
fastify.server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies['auth_token'] || cookies['token'] || url.searchParams.get('token');

    let userPayload: { userId: string; username: string } | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userPayload = {
          userId: String(decoded.userId || decoded.id || decoded.sub),
          username: String(decoded.username || 'user'),
        };
      } catch (err) {
        logger.warn(`WebSocket JWT verification failed: ${(err as Error).message}`);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // In development/test mode, allow query parameter authentication fallback
      const devUserId = url.searchParams.get('userId');
      if (devUserId) {
        userPayload = {
          userId: devUserId,
          username: url.searchParams.get('username') || 'dev_user',
        };
      }
    }

    if (!userPayload) {
      logger.warn('WebSocket connection rejected: 401 Unauthorized');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, userPayload);
    });
  } catch (err) {
    logger.error('Error handling WebSocket upgrade:', err);
    socket.destroy();
  }
});

function handleWebSocketMessage(socket: AuthenticatedWebSocket, envelope: WsEnvelope): void {
  switch (envelope.type) {
    case 'ping':
      socket.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
      break;

    case 'typing:start':
    case 'typing:stop':
      if (envelope.payload?.chatId) {
        roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope, socket);
      }
      break;

    case 'message:send':
    case 'message:new':
      if (envelope.payload?.chatId) {
        roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope);
      }
      break;

    case 'audio-call:invite':
    case 'audio-call:ring':
    case 'audio-call:accept':
    case 'audio-call:reject':
    case 'audio-call:ice-candidate':
    case 'audio-call:end':
      if (envelope.payload?.receiverId) {
        roomManager.sendToUser(envelope.payload.receiverId, envelope);
      }
      break;

    default:
      logger.debug(`Unhandled message type: ${envelope.type} from ${socket.userId}`);
      break;
  }
}

// WebSocket Connection handler
wss.on('connection', (ws: WebSocket, _req: IncomingMessage, user?: { userId: string; username: string }) => {
  const authWs = ws as AuthenticatedWebSocket;
  const userInfo = user || { userId: 'anonymous', username: 'anonymous' };
  authWs.userId = userInfo.userId;
  authWs.username = userInfo.username;
  authWs.isAlive = true;
  authWs.rooms = new Set<string>();

  roomManager.registerUser(authWs.userId, authWs);
  logger.info(`WebSocket connected: user=${authWs.username} (${authWs.userId})`);

  // Initial presence confirmation
  authWs.send(
    JSON.stringify({
      type: 'user:online',
      payload: { userId: authWs.userId, username: authWs.username },
    })
  );

  authWs.on('pong', () => {
    authWs.isAlive = true;
  });

  authWs.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString()) as WsEnvelope;
      handleWebSocketMessage(authWs, data);
    } catch (err) {
      logger.warn(`Malformed message from user ${authWs.userId}: ${(err as Error).message}`);
    }
  });

  authWs.on('close', () => {
    roomManager.leaveAll(authWs);
    logger.info(`WebSocket closed: user=${authWs.username} (${authWs.userId})`);
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
