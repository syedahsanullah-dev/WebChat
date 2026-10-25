import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';

export interface AuthenticatedUser {
  userId: string;
  username: string;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
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

export function authenticateUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  jwtSecret: string
): AuthenticatedUser | null {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies['auth_token'] || cookies['token'] || url.searchParams.get('token');

    let userPayload: AuthenticatedUser | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        userPayload = {
          userId: String(decoded.userId || decoded.id || decoded.sub),
          username: String(decoded.username || 'user'),
        };
      } catch (err) {
        logger.warn(`WebSocket JWT verification failed: ${(err as Error).message}`);
      }
    } else if (process.env.NODE_ENV !== 'production') {
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
      socket.write(
        'HTTP/1.1 401 Unauthorized\r\n' +
        'Content-Type: text/plain\r\n' +
        'Connection: close\r\n\r\n' +
        'Unauthorized\n'
      );
      socket.destroy();
      return null;
    }

    return userPayload;
  } catch (err) {
    logger.error('Error handling WebSocket upgrade auth:', err);
    socket.destroy();
    return null;
  }
}
