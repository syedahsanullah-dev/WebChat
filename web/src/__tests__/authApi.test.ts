import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as meHandler } from '@/app/api/auth/me/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import * as authModule from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userSession: {
      create: vi.fn().mockResolvedValue({ id: 'mock-session-id', sessionToken: 'mock-token' }),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('Phase 13: Authentication REST API Endpoints Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 400 on invalid or malformed JSON body', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Ahsan' }), // missing required fields
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 409 when username is already taken', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'existing-id' } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Ahsan',
          username: 'taken_user',
          email: 'new@example.com',
          password: 'Password123!',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('Username is already registered');
    });

    it('returns 409 when email is already taken', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // username available
        .mockResolvedValueOnce({ id: 'existing-id' } as any); // email taken

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Ahsan',
          username: 'valid_user',
          email: 'taken@example.com',
          password: 'Password123!',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('Email is already registered');
    });

    it('returns 201 and creates user with hashed password upon valid submission', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: 'new-user-uuid',
        displayName: 'Test User',
        username: 'test_user',
        email: 'test@example.com',
        avatarUrl: null,
        about: 'Hey there! I am using WebChat.',
        isOnline: false,
        createdAt: new Date(),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Test User',
          username: 'test_user',
          email: 'test@example.com',
          password: 'Password123!',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.message).toBe('Registration successful');
      expect(data.user.username).toBe('test_user');
      expect(res.headers.get('set-cookie')).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when identifier or password is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: '' }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
    });

    it('returns 401 when user does not exist', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'nonexistent',
          password: 'Password123!',
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain('Invalid username/email or password');
    });

    it('returns 401 when password does not match hash', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: 'user-1',
        username: 'validuser',
        email: 'valid@example.com',
        passwordHash: await bcrypt.hash('CorrectPassword1!', 10),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'validuser',
          password: 'WrongPassword123!',
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and auth cookie on successful credential verification', async () => {
      const plainPass = 'ValidSecret123!';
      const hash = await bcrypt.hash(plainPass, 10);

      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: 'user-123',
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice Cooper',
        avatarUrl: null,
        about: 'Online',
        passwordHash: hash,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'alice',
          password: plainPass,
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Login successful');
      expect(data.user.username).toBe('alice');
      expect(res.headers.get('set-cookie')).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 200 and expires the auth_token cookie', async () => {
      const res = await logoutHandler();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no auth cookie is present', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me');
      const res = await meHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with user profile when valid token cookie is provided', async () => {
      const token = authModule.signToken({
        userId: 'verified-user-1',
        username: 'verified_user',
        email: 'verified@example.com',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'verified-user-1',
        displayName: 'Verified User',
        username: 'verified_user',
        email: 'verified@example.com',
        avatarUrl: null,
        about: 'Available',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date(),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: {
          Cookie: `auth_token=${token}`,
        },
      });

      const res = await meHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.id).toBe('verified-user-1');
      expect(data.user.username).toBe('verified_user');
    });
  });
});
