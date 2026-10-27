"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookies = parseCookies;
exports.authenticateUpgrade = authenticateUpgrade;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_js_1 = require("../lib/logger.js");
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader)
        return cookies;
    const items = cookieHeader.split(';');
    for (const item of items) {
        const idx = item.indexOf('=');
        if (idx !== -1) {
            const key = item.slice(0, idx).trim();
            const val = item.slice(idx + 1).trim();
            try {
                cookies[key] = decodeURIComponent(val);
            }
            catch {
                cookies[key] = val;
            }
        }
    }
    return cookies;
}
function authenticateUpgrade(request, socket, jwtSecret) {
    try {
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
        const cookies = parseCookies(request.headers.cookie);
        const token = cookies['auth_token'] || cookies['token'] || url.searchParams.get('token');
        let userPayload = null;
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
                userPayload = {
                    userId: String(decoded.userId || decoded.id || decoded.sub),
                    username: String(decoded.username || 'user'),
                    systemRole: String(decoded.systemRole || 'USER'),
                };
            }
            catch (err) {
                logger_js_1.logger.warn(`WebSocket JWT verification failed: ${err.message}`);
            }
        }
        else if (process.env.NODE_ENV !== 'production') {
            const devUserId = url.searchParams.get('userId');
            if (devUserId) {
                userPayload = {
                    userId: devUserId,
                    username: url.searchParams.get('username') || 'dev_user',
                };
            }
        }
        if (!userPayload) {
            logger_js_1.logger.warn('WebSocket connection rejected: 401 Unauthorized');
            socket.write('HTTP/1.1 401 Unauthorized\r\n' +
                'Content-Type: text/plain\r\n' +
                'Connection: close\r\n\r\n' +
                'Unauthorized\n');
            socket.destroy();
            return null;
        }
        return userPayload;
    }
    catch (err) {
        logger_js_1.logger.error('Error handling WebSocket upgrade auth:', err);
        socket.destroy();
        return null;
    }
}
