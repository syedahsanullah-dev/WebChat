import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getUsers } from '@/app/api/admin/users/route';
import { GET as getUserDetails } from '@/app/api/admin/users/[id]/route';
import { PATCH as updateUserRole } from '@/app/api/admin/users/[id]/role/route';
import * as auth from '@/lib/auth';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 31: User Administration & Role Delegation APIs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is standard USER', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-standard',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-standard',
        systemRole: 'USER',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);

      expect(res.status).toBe(403);
    });

    it('returns 200 with paginated user list when user is MODERATOR', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-mod',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-mod',
        systemRole: 'MODERATOR',
      } as any);

      const mockUsers = [
        {
          id: 'u1',
          username: 'alice',
          email: 'alice@example.com',
          displayName: 'Alice',
          systemRole: 'USER',
          isSuspended: false,
          createdAt: new Date(),
          _count: { sentMessages: 10, sessions: 1 },
        },
      ];

      vi.mocked(prisma.user.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users?page=1&limit=25');
      const res = await getUsers(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
      expect(data.pagination.totalUsers).toBe(1);
      expect(data.users[0].username).toBe('alice');
    });
  });

  describe('GET /api/admin/users/[id]', () => {
    it('returns 200 with full user profile and session statistics', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-admin',
      } as any);

      vi.mocked(prisma.user.findUnique).mockImplementation((args: any) => {
        if (args.where.id === 'user-admin') {
          return Promise.resolve({
            id: 'user-admin',
            systemRole: 'ADMIN',
          } as any);
        }
        if (args.where.id === 'target-1') {
          return Promise.resolve({
            id: 'target-1',
            username: 'bob',
            email: 'bob@example.com',
            displayName: 'Bob',
            systemRole: 'USER',
            isSuspended: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            sessions: [],
            _count: {
              sentMessages: 5,
              chatParticipants: 2,
              sessions: 1,
            },
            auditLogs: [],
          } as any);
        }
        return Promise.resolve(null);
      });

      const req = new NextRequest('http://localhost:3000/api/admin/users/target-1');
      const res = await getUserDetails(req, {
        params: Promise.resolve({ id: 'target-1' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.username).toBe('bob');
      expect(data.stats.totalSentMessages).toBe(5);
    });
  });

  describe('PATCH /api/admin/users/[id]/role', () => {
    it('returns 400 when user attempts to modify own role', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-1',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-1',
        systemRole: 'ADMIN',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/admin-1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'USER', reason: 'Self-demotion attempt' }),
      });

      const res = await updateUserRole(req, {
        params: Promise.resolve({ id: 'admin-1' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Cannot modify your own administrative role');
    });

    it('returns 400 when audit reason is omitted or too short', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-1',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-1',
        systemRole: 'SUPER_ADMIN',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/target-1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'MODERATOR', reason: 'ab' }),
      });

      const res = await updateUserRole(req, {
        params: Promise.resolve({ id: 'target-1' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('justification reason');
    });

    it('returns 403 when ADMIN attempts to promote another user to ADMIN (only SUPER_ADMIN can)', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-1',
      } as any);

      vi.mocked(prisma.user.findUnique).mockImplementation((args: any) => {
        if (args.where.id === 'admin-1') {
          return Promise.resolve({
            id: 'admin-1',
            systemRole: 'ADMIN',
          } as any);
        }
        return Promise.resolve({
          id: 'target-1',
          username: 'charlie',
          systemRole: 'USER',
        } as any);
      });

      const req = new NextRequest('http://localhost:3000/api/admin/users/target-1/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'ADMIN', reason: 'Promotion to admin' }),
      });

      const res = await updateUserRole(req, {
        params: Promise.resolve({ id: 'target-1' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('do not have permission');
    });

    it('returns 200 when SUPER_ADMIN elevates USER to ADMIN with audit log entry', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'super-admin-1',
      } as any);

      vi.mocked(prisma.user.findUnique).mockImplementation((args: any) => {
        if (args.where.id === 'super-admin-1') {
          return Promise.resolve({
            id: 'super-admin-1',
            systemRole: 'SUPER_ADMIN',
          } as any);
        }
        return Promise.resolve({
          id: 'target-1',
          username: 'charlie',
          systemRole: 'USER',
        } as any);
      });

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'target-1',
        username: 'charlie',
        displayName: 'Charlie',
        email: 'charlie@example.com',
        systemRole: 'ADMIN',
        isSuspended: false,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/users/target-1/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'ADMIN',
          reason: 'Elevating trusted engineer to administrator',
        }),
      });

      const res = await updateUserRole(req, {
        params: Promise.resolve({ id: 'target-1' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.systemRole).toBe('ADMIN');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'super-admin-1',
            action: 'USER_ROLE_ELEVATED',
            resource: 'User:target-1',
          }),
        })
      );
    });
  });
});
