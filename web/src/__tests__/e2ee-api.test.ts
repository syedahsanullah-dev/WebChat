import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerKeyHandler, GET as getMyKeyHandler } from '@/app/api/users/keys/route';
import { GET as getPeerKeyHandler } from '@/app/api/users/[id]/key/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPublicKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Phase 16: E2EE Public Key Registry REST API Endpoints', () => {
  const mockAuthUser = {
    userId: 'user-alice-123',
    username: 'alice',
    email: 'alice@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/users/keys', () => {
    it('returns 401 when user is not authenticated', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/users/keys', {
        method: 'POST',
        body: JSON.stringify({ publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...' }),
      });

      const res = await registerKeyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toMatch(/unauthorized/i);
    });

    it('returns 400 when publicKey string is missing', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);

      const req = new NextRequest('http://localhost:3000/api/users/keys', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await registerKeyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/required/i);
    });

    it('successfully upserts public key and returns 200', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.upsert).mockResolvedValueOnce({
        id: 'key-1',
        userId: 'user-alice-123',
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
        algorithm: 'ECDH-P256',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/users/keys', {
        method: 'POST',
        body: JSON.stringify({
          publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
          algorithm: 'ECDH-P256',
        }),
      });

      const res = await registerKeyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.publicKey).toBe('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...');
      expect(prisma.userPublicKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-alice-123' },
        })
      );
    });
  });

  describe('GET /api/users/keys (Self public key)', () => {
    it('returns 404 when user key has not been published', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.findUnique).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/users/keys', {
        method: 'GET',
      });

      const res = await getMyKeyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toMatch(/not registered/i);
    });

    it('returns 200 and key data when found', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.findUnique).mockResolvedValueOnce({
        id: 'key-1',
        userId: 'user-alice-123',
        publicKey: 'SPKI_BASE64_ALICE',
        algorithm: 'ECDH-P256',
        createdAt: new Date('2026-10-27T00:00:00Z'),
        updatedAt: new Date('2026-10-27T00:00:00Z'),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/users/keys', {
        method: 'GET',
      });

      const res = await getMyKeyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.publicKey).toBe('SPKI_BASE64_ALICE');
      expect(data.userId).toBe('user-alice-123');
    });
  });

  describe('GET /api/users/[id]/key (Peer public key)', () => {
    it('returns 401 when caller is unauthenticated', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/users/user-bob-456/key', {
        method: 'GET',
      });

      const res = await getPeerKeyHandler(req, { params: Promise.resolve({ id: 'user-bob-456' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toMatch(/unauthorized/i);
    });

    it('returns 404 when target user public key is not found', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/users/user-bob-456/key', {
        method: 'GET',
      });

      const res = await getPeerKeyHandler(req, { params: Promise.resolve({ id: 'user-bob-456' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });

    it('returns 200 and public key when looked up by userId', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.findUnique).mockResolvedValueOnce({
        id: 'key-2',
        userId: 'user-bob-456',
        publicKey: 'SPKI_BASE64_BOB',
        algorithm: 'ECDH-P256',
        createdAt: new Date('2026-10-27T00:00:00Z'),
        user: {
          id: 'user-bob-456',
          username: 'bob',
          displayName: 'Bob Smith',
        },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/users/user-bob-456/key', {
        method: 'GET',
      });

      const res = await getPeerKeyHandler(req, { params: Promise.resolve({ id: 'user-bob-456' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe('user-bob-456');
      expect(data.publicKey).toBe('SPKI_BASE64_BOB');
    });

    it('returns 200 and public key when looked up by @username handle', async () => {
      vi.spyOn(authModule, 'getAuthUserFromRequest').mockReturnValueOnce(mockAuthUser);
      vi.mocked(prisma.userPublicKey.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-bob-456',
        username: 'bob',
        displayName: 'Bob Smith',
        publicKey: {
          id: 'key-2',
          userId: 'user-bob-456',
          publicKey: 'SPKI_BASE64_BOB',
          algorithm: 'ECDH-P256',
          createdAt: new Date('2026-10-27T00:00:00Z'),
        },
      } as any);

      const req = new NextRequest('http://localhost:3000/api/users/@bob/key', {
        method: 'GET',
      });

      const res = await getPeerKeyHandler(req, { params: Promise.resolve({ id: '@bob' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe('user-bob-456');
      expect(data.publicKey).toBe('SPKI_BASE64_BOB');
    });
  });
});
