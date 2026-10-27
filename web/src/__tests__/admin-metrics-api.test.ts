import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getMetrics } from '@/app/api/admin/metrics/route';
import * as auth from '@/lib/auth';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    chat: {
      count: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  },
}));

describe('Phase 29: Admin Metrics API (GET /api/admin/metrics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when request is not authenticated', async () => {
    vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

    const req = new NextRequest('http://localhost:3000/api/admin/metrics');
    const res = await getMetrics(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 403 when user has systemRole USER', async () => {
    vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
      userId: 'user-standard',
      username: 'john',
      email: 'john@example.com',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-standard',
      username: 'john',
      systemRole: 'USER',
      isSuspended: false,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/metrics');
    const res = await getMetrics(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 403 when user has systemRole MODERATOR (metrics requires ADMIN+)', async () => {
    vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
      userId: 'user-mod',
      username: 'moderator1',
      email: 'mod@example.com',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-mod',
      username: 'moderator1',
      systemRole: 'MODERATOR',
      isSuspended: false,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/admin/metrics');
    const res = await getMetrics(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 200 with consolidated metrics when user has systemRole ADMIN', async () => {
    vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
      userId: 'user-admin',
      username: 'admin1',
      email: 'admin@example.com',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-admin',
      username: 'admin1',
      systemRole: 'ADMIN',
      isSuspended: false,
    } as any);

    vi.mocked(prisma.user.count).mockResolvedValue(150);
    vi.mocked(prisma.chat.count).mockResolvedValue(45);
    vi.mocked(prisma.message.count)
      .mockResolvedValueOnce(3200) // totalMessages
      .mockResolvedValueOnce(280); // messagesSentLast24h

    const req = new NextRequest('http://localhost:3000/api/admin/metrics');
    const res = await getMetrics(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe('HEALTHY');
    expect(body.memory).toBeDefined();
    expect(body.memory.rssMB).toBeGreaterThan(0);
    expect(body.db.totalUsers).toBe(150);
    expect(body.db.totalChats).toBe(45);
    expect(body.db.totalMessages).toBe(3200);
    expect(body.db.messagesSentLast24h).toBe(280);
    expect(body.serverTime).toBeDefined();
  });
});
