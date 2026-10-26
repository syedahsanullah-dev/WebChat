import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSessions, DELETE as deleteOtherSessions } from '@/app/api/auth/sessions/route';
import { DELETE as deleteSingleSession } from '@/app/api/auth/sessions/[id]/route';
import { POST as changePasswordHandler } from '@/app/api/auth/password/route';
import * as auth from '@/lib/auth';
import * as sessionManager from '@/lib/sessionManager';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/auth');
vi.mock('@/lib/sessionManager');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('Phase 15: Sessions REST API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/sessions', () => {
    it('returns 401 when request is not authenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions');
      const res = await getSessions(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('returns 200 with sessions array when authenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
        sessionToken: 'token-current',
      });

      const mockSessions = [
        {
          id: 'sess-1',
          deviceType: 'DESKTOP',
          browser: 'Chrome',
          os: 'Windows',
          ipAddress: '127.0.0.1',
          lastActiveAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
        },
      ];
      vi.spyOn(sessionManager, 'getUserSessions').mockResolvedValue(mockSessions as any);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions');
      const res = await getSessions(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].browser).toBe('Chrome');
      expect(data.sessions[0].isCurrent).toBe(true);
    });
  });

  describe('DELETE /api/auth/sessions', () => {
    it('returns 401 when request is not authenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions', { method: 'DELETE' });
      const res = await deleteOtherSessions(req);

      expect(res.status).toBe(401);
    });

    it('returns 200 and revokes other sessions successfully', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
        sessionToken: 'token-current',
      });
      vi.spyOn(sessionManager, 'revokeAllOtherSessions').mockResolvedValue(2);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions', { method: 'DELETE' });
      const res = await deleteOtherSessions(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.revokedCount).toBe(2);
    });
  });

  describe('DELETE /api/auth/sessions/[id]', () => {
    it('returns 404 when session does not exist or belongs to another user', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
      });
      vi.spyOn(sessionManager, 'revokeSession').mockResolvedValue(false);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions/sess-999', {
        method: 'DELETE',
      });
      const res = await deleteSingleSession(req, {
        params: Promise.resolve({ id: 'sess-999' }),
      });

      expect(res.status).toBe(404);
    });

    it('returns 200 when session is successfully revoked', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
      });
      vi.spyOn(sessionManager, 'revokeSession').mockResolvedValue(true);

      const req = new NextRequest('http://localhost:3000/api/auth/sessions/sess-remote', {
        method: 'DELETE',
      });
      const res = await deleteSingleSession(req, {
        params: Promise.resolve({ id: 'sess-remote' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sessionId).toBe('sess-remote');
    });
  });

  describe('POST /api/auth/password', () => {
    it('returns 401 when request is not authenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'old', newPassword: 'newPassword123' }),
      });
      const res = await changePasswordHandler(req);

      expect(res.status).toBe(401);
    });

    it('returns 401 when current password is wrong', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
      });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-123', passwordHash: 'hash-abc' });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'wrongPassword', newPassword: 'newPassword123' }),
      });
      const res = await changePasswordHandler(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Incorrect current password');
    });

    it('returns 200 and revokes all other sessions when password is changed', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
        sessionToken: 'token-current',
      });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-123', passwordHash: 'hash-abc' });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);
      (prisma.user.update as any).mockResolvedValue({ id: 'user-123' });
      vi.spyOn(sessionManager, 'revokeAllOtherSessions').mockResolvedValue(3);

      const req = new NextRequest('http://localhost:3000/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: 'oldPassword1', newPassword: 'newPassword123' }),
      });
      const res = await changePasswordHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.revokedOtherSessions).toBe(3);
      expect(sessionManager.revokeAllOtherSessions).toHaveBeenCalledWith('user-123', 'token-current');
    });
  });
});
