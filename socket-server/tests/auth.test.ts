import { describe, it, expect } from 'vitest';
import { parseCookies, authenticateUpgrade } from '../src/middleware/auth.js';
import jwt from 'jsonwebtoken';
import { PassThrough } from 'stream';
import type { IncomingMessage } from 'http';

const JWT_SECRET = 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';

describe('Auth Middleware Unit Tests', () => {
  describe('parseCookies', () => {
    it('returns empty object when cookie header is undefined or empty', () => {
      expect(parseCookies(undefined)).toEqual({});
      expect(parseCookies('')).toEqual({});
    });

    it('parses single cookie correctly', () => {
      expect(parseCookies('auth_token=jwt_sample_123')).toEqual({
        auth_token: 'jwt_sample_123',
      });
    });

    it('parses multiple cookies with spaces and URI encoded values', () => {
      const cookieStr = 'auth_token=sample.token; user_pref=dark%20mode; session=abc123';
      const parsed = parseCookies(cookieStr);
      expect(parsed.auth_token).toBe('sample.token');
      expect(parsed.user_pref).toBe('dark mode');
      expect(parsed.session).toBe('abc123');
    });
  });

  describe('authenticateUpgrade', () => {
    it('authenticates user from auth_token cookie', () => {
      const token = jwt.sign({ userId: 'u-1', username: 'testuser' }, JWT_SECRET);
      const fakeReq = {
        url: '/',
        headers: {
          host: 'localhost:4000',
          cookie: `auth_token=${token}`,
        },
      } as unknown as IncomingMessage;

      const fakeSocket = new PassThrough();
      const user = authenticateUpgrade(fakeReq, fakeSocket as any, JWT_SECRET);

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('u-1');
      expect(user?.username).toBe('testuser');
    });

    it('authenticates user from query token parameter fallback', () => {
      const token = jwt.sign({ userId: 'u-query', username: 'queryuser' }, JWT_SECRET);
      const fakeReq = {
        url: `/?token=${token}`,
        headers: {
          host: 'localhost:4000',
        },
      } as unknown as IncomingMessage;

      const fakeSocket = new PassThrough();
      const user = authenticateUpgrade(fakeReq, fakeSocket as any, JWT_SECRET);

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('u-query');
      expect(user?.username).toBe('queryuser');
    });

    it('rejects with 401 and destroys socket on missing token', () => {
      const fakeReq = {
        url: '/',
        headers: {
          host: 'localhost:4000',
        },
      } as unknown as IncomingMessage;

      let socketDestroyed = false;
      let writtenData = '';
      const fakeSocket = new PassThrough();
      fakeSocket.on('data', (chunk) => {
        writtenData += chunk.toString();
      });
      fakeSocket.destroy = (() => {
        socketDestroyed = true;
        return fakeSocket;
      }) as any;

      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production'; // ensure no dev fallback
      const user = authenticateUpgrade(fakeReq, fakeSocket as any, JWT_SECRET);
      process.env.NODE_ENV = prevEnv;

      expect(user).toBeNull();
      expect(socketDestroyed).toBe(true);
      expect(writtenData).toContain('HTTP/1.1 401 Unauthorized');
      expect(writtenData).toContain('Connection: close');
    });

    it('rejects with 401 on expired token', () => {
      const expiredToken = jwt.sign({ userId: 'u-exp', username: 'exp' }, JWT_SECRET, {
        expiresIn: '-10s',
      });
      const fakeReq = {
        url: `/?token=${expiredToken}`,
        headers: {
          host: 'localhost:4000',
        },
      } as unknown as IncomingMessage;

      let socketDestroyed = false;
      const fakeSocket = new PassThrough();
      fakeSocket.destroy = (() => {
        socketDestroyed = true;
        return fakeSocket;
      }) as any;

      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const user = authenticateUpgrade(fakeReq, fakeSocket as any, JWT_SECRET);
      process.env.NODE_ENV = prevEnv;

      expect(user).toBeNull();
      expect(socketDestroyed).toBe(true);
    });
  });
});
