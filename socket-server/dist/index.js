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
// Load environment variables
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';
const PING_INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || '30000', 10);
exports.fastify = (0, fastify_1.default)({
    logger: false, // We use Winston logger
});
// Register plugins
exports.fastify.register(cors_1.default, {
    origin: CORS_ORIGIN,
    credentials: true,
});
exports.fastify.register(cookie_1.default);
// Health check endpoint
exports.fastify.get('/health', async () => {
    return {
        status: 'ok',
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        onlineUsers: roomManager_js_1.roomManager.getOnlineUserCount(),
        activeRooms: roomManager_js_1.roomManager.getActiveRoomCount(),
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
// Native ws WebSocketServer mounted with manual upgrade handling
exports.wss = new ws_1.WebSocketServer({ noServer: true });
// Attach upgrade listener to fastify.server
exports.fastify.server.on('upgrade', (request, socket, head) => {
    const user = (0, auth_js_1.authenticateUpgrade)(request, socket, JWT_SECRET);
    if (!user)
        return;
    exports.wss.handleUpgrade(request, socket, head, (ws) => {
        exports.wss.emit('connection', ws, request, user);
    });
});
function handleWebSocketMessage(socket, envelope) {
    switch (envelope.type) {
        case 'ping':
            socket.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
            break;
        case 'typing:start':
        case 'typing:stop':
            if (envelope.payload?.chatId) {
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope, socket);
            }
            break;
        case 'message:send':
        case 'message:new':
            if (envelope.payload?.chatId) {
                roomManager_js_1.roomManager.broadcastToRoom(`chat:${envelope.payload.chatId}`, envelope);
            }
            break;
        case 'audio-call:invite':
        case 'audio-call:ring':
        case 'audio-call:accept':
        case 'audio-call:reject':
        case 'audio-call:ice-candidate':
        case 'audio-call:end':
            if (envelope.payload?.receiverId) {
                roomManager_js_1.roomManager.sendToUser(envelope.payload.receiverId, envelope);
            }
            break;
        default:
            logger_js_1.logger.debug(`Unhandled message type: ${envelope.type} from ${socket.userId}`);
            break;
    }
}
// WebSocket Connection handler
exports.wss.on('connection', (ws, _req, user) => {
    const authWs = ws;
    const userInfo = user || { userId: 'anonymous', username: 'anonymous' };
    authWs.userId = userInfo.userId;
    authWs.username = userInfo.username;
    authWs.isAlive = true;
    authWs.rooms = new Set();
    roomManager_js_1.roomManager.registerUser(authWs.userId, authWs);
    logger_js_1.logger.info(`WebSocket connected: user=${authWs.username} (${authWs.userId})`);
    // Initial presence confirmation
    authWs.send(JSON.stringify({
        type: 'user:online',
        payload: { userId: authWs.userId, username: authWs.username },
    }));
    authWs.on('pong', () => {
        authWs.isAlive = true;
    });
    authWs.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData.toString());
            handleWebSocketMessage(authWs, data);
        }
        catch (err) {
            logger_js_1.logger.warn(`Malformed message from user ${authWs.userId}: ${err.message}`);
        }
    });
    authWs.on('close', () => {
        roomManager_js_1.roomManager.leaveAll(authWs);
        logger_js_1.logger.info(`WebSocket closed: user=${authWs.username} (${authWs.userId})`);
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
    }
    catch (err) {
        logger_js_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
}
// Graceful shutdown
const shutdown = async () => {
    logger_js_1.logger.info('Shutting down socket server...');
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
