import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStorageAnalytics } from '@/app/api/admin/storage/analytics/route';
import { GET as scanOrphanFilesRoute } from '@/app/api/admin/storage/orphan-scan/route';
import { POST as cleanOrphanFilesRoute } from '@/app/api/admin/storage/orphan-clean/route';
import * as auth from '@/lib/auth';
import * as storageScanner from '@/lib/storageScanner';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/auth');
vi.mock('@/lib/storageScanner');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 30: Storage Management & Orphan Cleaner APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/storage/analytics', () => {
    it('returns 401 when unauthenticated', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/storage/analytics');
      const res = await getStorageAnalytics(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not ADMIN', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'user-standard',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-standard',
        systemRole: 'USER',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/storage/analytics');
      const res = await getStorageAnalytics(req);

      expect(res.status).toBe(403);
    });

    it('returns 200 with analytics payload when user is ADMIN', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-user',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-user',
        systemRole: 'ADMIN',
      } as any);

      vi.spyOn(storageScanner, 'getStorageAnalytics').mockResolvedValue({
        totalBytes: 52428800,
        totalFiles: 120,
        categories: {
          avatars: { bytes: 204800, count: 10 },
          images: { bytes: 31457280, count: 80 },
          voice: { bytes: 10485760, count: 20 },
          docs: { bytes: 10280960, count: 10 },
        },
      });

      const req = new NextRequest('http://localhost:3000/api/admin/storage/analytics');
      const res = await getStorageAnalytics(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalBytes).toBe(52428800);
      expect(data.totalFiles).toBe(120);
      expect(data.categories.images.count).toBe(80);
    });
  });

  describe('GET /api/admin/storage/orphan-scan', () => {
    it('returns 200 with detected orphan candidates', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-user',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-user',
        systemRole: 'SUPER_ADMIN',
      } as any);

      vi.spyOn(storageScanner, 'scanOrphanFiles').mockResolvedValue([
        {
          id: 'images/orphan1.webp',
          filename: 'orphan1.webp',
          relativePath: 'images/orphan1.webp',
          sizeBytes: 102400,
          category: 'images',
          modifiedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ]);

      const req = new NextRequest('http://localhost:3000/api/admin/storage/orphan-scan');
      const res = await scanOrphanFilesRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalOrphans).toBe(1);
      expect(data.totalBytesReclaimable).toBe(102400);
      expect(data.files[0].relativePath).toBe('images/orphan1.webp');
    });
  });

  describe('POST /api/admin/storage/orphan-clean', () => {
    it('returns 400 when paths array is empty or missing', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-user',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-user',
        systemRole: 'ADMIN',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/admin/storage/orphan-clean', {
        method: 'POST',
        body: JSON.stringify({ paths: [] }),
      });
      const res = await cleanOrphanFilesRoute(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('array of approved relative file paths is required');
    });

    it('returns 200 and purges unreferenced files with audit log', async () => {
      vi.spyOn(auth, 'getAuthUserFromRequest').mockReturnValue({
        userId: 'admin-user',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-user',
        systemRole: 'ADMIN',
      } as any);

      vi.spyOn(storageScanner, 'purgeOrphanFiles').mockResolvedValue({
        filesDeleted: 2,
        bytesReclaimed: 204800,
      });

      const req = new NextRequest('http://localhost:3000/api/admin/storage/orphan-clean', {
        method: 'POST',
        body: JSON.stringify({
          paths: ['images/orphan1.webp', 'voice/old_voice.opus'],
        }),
      });
      const res = await cleanOrphanFilesRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.filesDeleted).toBe(2);
      expect(data.bytesReclaimed).toBe(204800);
    });
  });
});
