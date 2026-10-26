import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCookies, authenticateUpgrade } from '../src/middleware/auth.js';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

describe('Phase 13: WebSocket Upgrade Authentication Tests', () => {
  const TEST_JWT_SECRET = 'test-secret-key-32-bytes-minimum-length!';

  function createMockDuplex(): Duplex {
    return {
      write: vi.fn(),
      destroy: vi.fn(),
    } as unknown as Duplex;
  }

  describe('parseCookies', () => {
    it('returns empty object when header is undefined or empty', () => {
      expect(parseCookies(undefined)).toEqual({});
      expect(parseCookies('')).toEqual({});
    });

    it('parses multiple cookies separated by semicolon', () => {
      const header = 'auth_token=jwt123; theme=dark; session_id=abc';
      const parsed = parseCookies(header);
      expect(parsed).toEqual({
        auth_token: 'jwt123',
        theme: 'dark',
        session_id: 'abc',
      });
    });

    it('decodes URI encoded cookie values properly', () => {
      const header = 'user_data=%7B%22name%22%3A%22Ahsan%22%7D';
      const parsed = parseCookies(header);
      expect(parsed.user_data).toBe('{"name":"Ahsan"}');
    });
  });

  describe('authenticateUpgrade', () => {
    it('rejects with HTTP 401 and destroys socket when no cookie or token is provided in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockRequest = {
        url: '/',
        headers: { host: 'ws.vusigma.com' },
      } as IncomingMessage;
      const mockSocket = createMockDuplex();

      const user = authenticateUpgrade(mockRequest, mockSocket, TEST_JWT_SECRET);

      expect(user).toBeNull();
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 401 Unauthorized')
      );
      expect(mockSocket.destroy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('rejects with HTTP 401 when token has an invalid signature or is expired', () => {
      const expiredToken = jwt.sign(
        { userId: 'u1', username: 'alex' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const mockRequest = {
        url: '/',
        headers: {
          host: 'ws.vusigma.com',
          cookie: `auth_token=${expiredToken}`,
        },
      } as IncomingMessage;
      const mockSocket = createMockDuplex();

      const user = authenticateUpgrade(mockRequest, mockSocket, TEST_JWT_SECRET);

      expect(user).toBeNull();
      expect(mockSocket.write).toHaveBeenCalledWith(
        expect.stringContaining('HTTP/1.1 401 Unauthorized')
      );
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('successfully authenticates and returns user payload when valid token is in auth_token cookie', () => {
      const validToken = jwt.sign(
        { userId: 'user-valid-100', username: 'ahsan_lead' },
        TEST_JWT_SECRET,
        { expiresIn: '7d' }
      );

      const mockRequest = {
        url: '/',
        headers: {
          host: 'ws.vusigma.com',
          cookie: `auth_token=${validToken}`,
        },
      } as IncomingMessage;
      const mockSocket = createMockDuplex();

      const user = authenticateUpgrade(mockRequest, mockSocket, TEST_JWT_SECRET);

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('user-valid-100');
      expect(user?.username).toBe('ahsan_lead');
      expect(mockSocket.write).not.toHaveBeenCalled();
      expect(mockSocket.destroy).not.toHaveBeenCalled();
    });

    it('accepts token provided via query parameter ?token=...', () => {
      const validToken = jwt.sign(
        { userId: 'user-param-200', username: 'mobile_chrome_user' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockRequest = {
        url: `/?token=${validToken}`,
        headers: { host: 'ws.vusigma.com' },
      } as IncomingMessage;
      const mockSocket = createMockDuplex();

      const user = authenticateUpgrade(mockRequest, mockSocket, TEST_JWT_SECRET);

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('user-param-200');
      expect(user?.username).toBe('mobile_chrome_user');
    });
  });
});
