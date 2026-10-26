import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as searchHandler } from '@/app/api/users/search/route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
    },
    chat: {
      findMany: vi.fn(),
    },
    chatParticipant: {
      findMany: vi.fn(),
    },
  },
}));

describe('Phase 13: User Search API Integration Tests', () => {
  const currentUserId = 'logged-in-user-id';
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    validToken = authModule.signToken({
      userId: currentUserId,
      username: 'current_user',
      email: 'current@example.com',
    });
  });

  it('returns 401 when request is unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/users/search?q=alex');
    const res = await searchHandler(req);
    expect(res.status).toBe(401);
  });

  it('returns empty array when query parameter is missing or empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/users/search?q=', {
      headers: { Cookie: `auth_token=${validToken}` },
    });
    const res = await searchHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toEqual([]);
  });

  it('finds users matching query prefix and maps contact and existing chat info', async () => {
    const matchedUser = {
      id: 'target-user-2',
      username: 'alex_lead',
      displayName: 'Alex Lead',
      email: 'alex@example.com',
      avatarUrl: null,
      about: 'Building WebChat',
      isOnline: true,
      createdAt: new Date(),
    };

    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([matchedUser] as any);
    vi.mocked(prisma.contact.findMany).mockResolvedValueOnce([
      { id: 'contact-record-1', contactUserId: 'target-user-2', aliasName: 'Team Lead' },
    ] as any);
    vi.mocked(prisma.chat.findMany).mockResolvedValueOnce([
      {
        id: 'direct-chat-999',
        isGroup: false,
        participants: [
          { userId: currentUserId },
          { userId: 'target-user-2' },
        ],
      },
    ] as any);

    const req = new NextRequest('http://localhost:3000/api/users/search?q=alex', {
      headers: { Cookie: `auth_token=${validToken}` },
    });

    const res = await searchHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].username).toBe('alex_lead');
    expect(data.users[0].isContact).toBe(true);
    expect(data.users[0].aliasName).toBe('Team Lead');
    expect(data.users[0].existingChatId).toBe('direct-chat-999');
  });

  it('handles handle queries starting with @ symbol cleanly', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      {
        id: 'target-user-3',
        username: 'sarah_connor',
        displayName: 'Sarah Connor',
        email: 'sarah@example.com',
        avatarUrl: null,
        about: 'Available',
        isOnline: false,
        createdAt: new Date(),
      },
    ] as any);
    vi.mocked(prisma.contact.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.chat.findMany).mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/users/search?q=@sarah', {
      headers: { Cookie: `auth_token=${validToken}` },
    });

    const res = await searchHandler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.users[0].username).toBe('sarah_connor');
    expect(data.users[0].isContact).toBe(false);
  });
});
