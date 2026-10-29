import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';

// Mock Prisma
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      userPushSubscription: {
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      callLog: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

// Mock web-push
vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
  };
});

// Mock Auth
vi.mock('@/lib/auth', () => {
  return {
    getAuthUserFromRequest: vi.fn(),
  };
});

import prisma from '@/lib/prisma';
import webpush from 'web-push';
import { getAuthUserFromRequest } from '@/lib/auth';
import { sendIncomingCallPush, sendCallPushToSubscription } from '@/lib/pushService';
import { POST as sendPushRoute } from '@/app/api/push/send/route';
import { POST as rejectCallRoute } from '@/app/api/calls/reject/route';
import { initSilentAudioUnlock, playCallAudioSafely } from '@/lib/audio';

describe('Phase 40: Mobile PWA Voice Ergonomics, WakeLock, MediaSession & Background Call Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. pushService.sendIncomingCallPush', () => {
    it('returns sent: 0 when callee has no active push subscriptions', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([]);

      const result = await sendIncomingCallPush('user-callee', {
        callId: 'call-100',
        chatId: 'chat-100',
        callerName: 'Alice',
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('dispatches high-priority VAPID push with 45s TTL and inline Accept/Decline actions', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-mobile',
          userId: 'user-callee',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-mobile',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
          userAgent: 'Chrome Android',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(webpush.sendNotification).mockResolvedValueOnce({} as any);

      const result = await sendIncomingCallPush('user-callee', {
        callId: 'call-100',
        chatId: 'chat-100',
        callerName: 'Alice',
        callerAvatar: '/uploads/avatars/alice.webp',
      });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

      const [targetSub, payloadString, options] = vi.mocked(webpush.sendNotification).mock.calls[0];
      expect(targetSub.endpoint).toBe('https://fcm.googleapis.com/fcm/send/endpoint-mobile');
      expect(options).toEqual({ TTL: 45, urgency: 'high' });

      const parsedPayload = JSON.parse(payloadString as string);
      expect(parsedPayload.type).toBe('call_invite');
      expect(parsedPayload.callId).toBe('call-100');
      expect(parsedPayload.chatId).toBe('chat-100');
      expect(parsedPayload.callerName).toBe('Alice');
      expect(parsedPayload.requireInteraction).toBe(true);
      expect(parsedPayload.actions).toEqual([
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' },
      ]);
    });

    it('cleans up expired endpoints returning HTTP 410 Gone', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 'sub-expired',
          userId: 'user-callee',
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410, message: 'Gone' });
      vi.mocked(prisma.userPushSubscription.delete).mockResolvedValueOnce({} as any);

      const result = await sendIncomingCallPush('user-callee', {
        callId: 'call-expired',
        chatId: 'chat-1',
        callerName: 'Bob',
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.cleaned).toBe(1);
      expect(prisma.userPushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'sub-expired' } });
    });
  });

  describe('2. POST /api/push/send', () => {
    it('rejects unauthenticated requests with 401', async () => {
      vi.mocked(getAuthUserFromRequest).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost:3000/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: 'user-callee' }),
      });

      const res = await sendPushRoute(req);
      expect(res.status).toBe(401);
    });

    it('authorizes Server #2 via Bearer internal secret and triggers call invite push', async () => {
      vi.mocked(prisma.userPushSubscription.findMany).mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-internal-secret',
        },
        body: JSON.stringify({
          recipientId: 'user-callee',
          type: 'call_invite',
          callId: 'call-200',
          chatId: 'chat-200',
          callerName: 'Charlie',
        }),
      });

      const res = await sendPushRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.type).toBe('call_invite');
    });
  });

  describe('3. POST /api/calls/reject', () => {
    it('returns 400 when callId is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await rejectCallRoute(req);
      expect(res.status).toBe(400);
    });

    it('updates CallLog to rejected when declining from background service worker', async () => {
      vi.mocked(prisma.callLog.findUnique).mockResolvedValueOnce({
        id: 'call-300',
        chatId: 'chat-1',
        callerId: 'u1',
        receiverId: 'u2',
        callType: 'audio',
        status: 'ringing',
        duration: 0,
        startedAt: new Date(),
        endedAt: null,
      });
      vi.mocked(prisma.callLog.update).mockResolvedValueOnce({} as any);

      const req = new NextRequest('http://localhost:3000/api/calls/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: 'call-300', reason: 'declined' }),
      });

      const res = await rejectCallRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('rejected');
      expect(prisma.callLog.update).toHaveBeenCalledWith({
        where: { id: 'call-300' },
        data: expect.objectContaining({ status: 'rejected' }),
      });
    });
  });

  describe('4. Audio Autoplay Resilience & Unlock', () => {
    it('initializes silent audio unlock listener and returns a cleanup function', () => {
      const cleanup = initSilentAudioUnlock();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('dispatches webchat:autoplay-blocked custom event when play() is blocked by browser policy', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const mockAudio = {
        play: vi.fn().mockRejectedValue({ name: 'NotAllowedError', message: 'User interaction required' }),
      } as unknown as HTMLAudioElement;

      const success = await playCallAudioSafely(mockAudio);
      expect(success).toBe(false);
      expect(dispatchSpy).toHaveBeenCalled();
      const dispatchedEvent = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('webchat:autoplay-blocked');
    });
  });
});
