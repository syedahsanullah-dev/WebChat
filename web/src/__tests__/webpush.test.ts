import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';

// Mock dependencies before importing routes/services
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      userPushSubscription: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  };
});

vi.mock('@/lib/auth', () => {
  return {
    getAuthUserFromRequest: vi.fn(),
  };
});

import prisma from '@/lib/prisma';
import webpush from 'web-push';
import { getAuthUserFromRequest } from '@/lib/auth';
import { sendPushToUser } from '@/lib/pushService';
import { GET as getVapidKey } from '@/app/api/push/vapid-public-key/route';
import { POST as subscribePush } from '@/app/api/push/subscribe/route';
import { POST as unsubscribePush } from '@/app/api/push/unsubscribe/route';
import { POST as internalTriggerPush } from '@/app/api/push/internal-trigger/route';

describe('Phase 23: Background Web Push Notifications (VAPID)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';
  });

  describe('1. pushService.sendPushToUser', () => {
    it('returns sent: 0 when user has no active push subscriptions', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([]);

      const result = await sendPushToUser('user-1', {
        title: 'New Message',
        body: 'Hello World',
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.cleaned).toBe(0);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('dispatches web-push notification to all user endpoints', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint1',
          p256dh: 'key1',
          auth: 'auth1',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint2',
          p256dh: 'key2',
          auth: 'auth2',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

      const result = await sendPushToUser('user-1', {
        title: 'Alice',
        body: 'How are you?',
        chatId: 'chat-123',
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('cleans up expired endpoints returning HTTP 410 Gone from database', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-expired',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
          p256dh: 'key',
          auth: 'auth',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const err: any = new Error('Subscription expired');
      err.statusCode = 410;
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(err);
      vi.mocked(prisma.userPushSubscription.delete).mockResolvedValueOnce({} as any);

      const result = await sendPushToUser('user-1', {
        title: 'Bob',
        body: 'Hey',
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.cleaned).toBe(1);
      expect(prisma.userPushSubscription.delete).toHaveBeenCalledWith({
        where: { id: 'sub-expired' },
      });
    });
  });

  describe('2. Push API Endpoints', () => {
    it('GET /api/push/vapid-public-key returns the public key', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-vapid-key';
      const res = await getVapidKey();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.publicKey).toBe('test-public-vapid-key');
    });

    it('POST /api/push/subscribe returns 401 when unauthenticated', async () => {
      vi.mocked(getAuthUserFromRequest).mockReturnValueOnce(null);

      const req = new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: 'https://example.com' }),
      });

      const res = await subscribePush(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/push/subscribe returns 400 when missing keys', async () => {
      vi.mocked(getAuthUserFromRequest).mockReturnValueOnce({
        userId: 'user-1',
        username: 'alice',
        email: 'alice@test.com',
      });

      const req = new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: 'https://example.com' }),
      });

      const res = await subscribePush(req);
      expect(res.status).toBe(400);
    });

    it('POST /api/push/subscribe registers subscription when valid', async () => {
      vi.mocked(getAuthUserFromRequest).mockReturnValueOnce({
        userId: 'user-1',
        username: 'alice',
        email: 'alice@test.com',
      });

      vi.mocked(prisma.userPushSubscription.upsert).mockResolvedValueOnce({
        id: 'sub-100',
        userId: 'user-1',
        endpoint: 'https://fcm.google.com/send/1',
        p256dh: 'p256',
        auth: 'authKey',
        userAgent: 'Chrome',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.google.com/send/1',
          keys: { p256dh: 'p256', auth: 'authKey' },
        }),
      });

      const res = await subscribePush(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.subscriptionId).toBe('sub-100');
    });

    it('POST /api/push/unsubscribe deletes endpoint for authenticated user', async () => {
      vi.mocked(getAuthUserFromRequest).mockReturnValueOnce({
        userId: 'user-1',
        username: 'alice',
        email: 'alice@test.com',
      });

      vi.mocked(prisma.userPushSubscription.deleteMany).mockResolvedValueOnce({ count: 1 });

      const req = new NextRequest('http://localhost/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: 'https://fcm.google.com/send/1' }),
      });

      const res = await unsubscribePush(req);
      expect(res.status).toBe(200);
      expect(prisma.userPushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', endpoint: 'https://fcm.google.com/send/1' },
      });
    });

    it('POST /api/push/internal-trigger rejects unauthorized calls', async () => {
      process.env.INTERNAL_API_SECRET = 'secret123';

      const req = new NextRequest('http://localhost/api/push/internal-trigger', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong-secret' },
        body: JSON.stringify({ recipientId: 'user-1', payload: { title: 'Test' } }),
      });

      const res = await internalTriggerPush(req);
      expect(res.status).toBe(401);
    });
  });
});
