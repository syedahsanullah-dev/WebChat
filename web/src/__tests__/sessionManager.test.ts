import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseUserAgent,
  extractClientIp,
  createSession,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  touchSession,
} from '@/lib/sessionManager';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('Phase 15: Device Session Management & Multi-Device Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User-Agent & Device Parser', () => {
    it('detects Windows Desktop Chrome', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const parsed = parseUserAgent(ua);
      expect(parsed.os).toBe('Windows');
      expect(parsed.browser).toBe('Chrome');
      expect(parsed.deviceType).toBe('DESKTOP');
    });

    it('detects macOS Safari Desktop', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      const parsed = parseUserAgent(ua);
      expect(parsed.os).toBe('macOS');
      expect(parsed.browser).toBe('Safari');
      expect(parsed.deviceType).toBe('DESKTOP');
    });

    it('detects Android Mobile Chrome', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36';
      const parsed = parseUserAgent(ua);
      expect(parsed.os).toBe('Android');
      expect(parsed.browser).toBe('Chrome');
      expect(parsed.deviceType).toBe('MOBILE');
    });

    it('detects iPad Safari Tablet', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const parsed = parseUserAgent(ua);
      expect(parsed.os).toBe('iOS');
      expect(parsed.browser).toBe('Safari');
      expect(parsed.deviceType).toBe('TABLET');
    });

    it('detects Windows Edge', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const parsed = parseUserAgent(ua);
      expect(parsed.os).toBe('Windows');
      expect(parsed.browser).toBe('Edge');
      expect(parsed.deviceType).toBe('DESKTOP');
    });

    it('falls back gracefully on empty or null user agent', () => {
      const parsed = parseUserAgent(null);
      expect(parsed.os).toBe('Unknown OS');
      expect(parsed.browser).toBe('Browser');
      expect(parsed.deviceType).toBe('UNKNOWN');
    });
  });

  describe('Client IP Extraction', () => {
    it('extracts primary IP from x-forwarded-for header with proxies', () => {
      const req = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      });
      expect(extractClientIp(req)).toBe('203.0.113.195');
    });

    it('extracts IP from x-real-ip header when x-forwarded-for is missing', () => {
      const req = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '198.51.100.42' },
      });
      expect(extractClientIp(req)).toBe('198.51.100.42');
    });

    it('falls back to 127.0.0.1 when headers are missing', () => {
      const req = new Request('http://localhost:3000');
      expect(extractClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('Session Storage & Lifecycle', () => {
    it('creates a session with a cryptographically secure 64-character token', async () => {
      const mockSession = {
        id: 'sess-123',
        userId: 'user-abc',
        sessionToken: 'token-hex',
        ipAddress: '127.0.0.1',
        deviceType: 'DESKTOP',
        browser: 'Chrome',
        os: 'Windows',
        lastActiveAt: new Date(),
        createdAt: new Date(),
      };
      (prisma.userSession.create as any).mockResolvedValue(mockSession);

      const req = new Request('http://localhost:3000', {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const { session, sessionToken } = await createSession('user-abc', req);

      expect(prisma.userSession.create).toHaveBeenCalledOnce();
      expect(sessionToken).toHaveLength(64); // 32 bytes hex
      expect(session.id).toBe('sess-123');
    });

    it('lists user sessions with correct isCurrent flag', async () => {
      const mockDate = new Date();
      (prisma.userSession.findMany as any).mockResolvedValue([
        {
          id: 'sess-current',
          sessionToken: 'token-current',
          deviceType: 'DESKTOP',
          browser: 'Chrome',
          os: 'Windows',
          ipAddress: '127.0.0.1',
          lastActiveAt: mockDate,
          createdAt: mockDate,
        },
        {
          id: 'sess-remote',
          sessionToken: 'token-remote',
          deviceType: 'MOBILE',
          browser: 'Chrome',
          os: 'Android',
          ipAddress: '10.0.0.1',
          lastActiveAt: mockDate,
          createdAt: mockDate,
        },
      ]);

      const list = await getUserSessions('user-abc', 'token-current');
      expect(list).toHaveLength(2);
      expect(list[0].isCurrent).toBe(true);
      expect(list[1].isCurrent).toBe(false);
    });

    it('revokes a specific session by ID', async () => {
      (prisma.userSession.deleteMany as any).mockResolvedValue({ count: 1 });

      const success = await revokeSession('user-abc', 'sess-remote');
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { id: 'sess-remote', userId: 'user-abc' },
      });
      expect(success).toBe(true);
    });

    it('revokes all other sessions preserving current sessionToken', async () => {
      (prisma.userSession.deleteMany as any).mockResolvedValue({ count: 3 });

      const count = await revokeAllOtherSessions('user-abc', 'token-current');
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-abc',
          sessionToken: { not: 'token-current' },
        },
      });
      expect(count).toBe(3);
    });

    it('touches session lastActiveAt without throwing on failure', async () => {
      (prisma.userSession.update as any).mockResolvedValue({});
      await expect(touchSession('some-token')).resolves.not.toThrow();
      expect(prisma.userSession.update).toHaveBeenCalledOnce();
    });
  });
});
