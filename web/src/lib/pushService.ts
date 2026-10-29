import webpush from 'web-push';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  chatId?: string;
  senderName?: string;
  avatarUrl?: string;
  tag?: string;
}

export interface IncomingCallPushPayload {
  callId: string;
  chatId: string;
  callerName: string;
  callerAvatar?: string | null;
  title?: string;
  body?: string;
  sdpOffer?: any;
}

// Initialize VAPID details if environment variables are provided
let isVapidConfigured = false;

const DEFAULT_VAPID_PUBLIC_KEY =
  'BGBM6mKJ-GnXm5jvnwG_uwCReH3Kc3X1EV1l5mrOB-H8hJUE4ZP6UM-o1dyuqbSorldUnwv702zLYjmdF04TBw0';
const DEFAULT_VAPID_PRIVATE_KEY =
  'oNRkH0vD_NpPLsorDIZb-hiOrJbgXRjtCPZXCFzisJE';

export function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@vusigma.com';
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      isVapidConfigured = true;
      return true;
    } catch (err) {
      logger.error('Failed to configure VAPID details for web-push', { error: err });
    }
  }
  return false;
}

// Attempt initial configuration
ensureVapidConfigured();

/**
 * Dispatches a Web Push notification to all active browser push subscriptions for a user.
 * Automatically cleans up expired or unsubscribed endpoints (HTTP 410 Gone / 404 Not Found).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!ensureVapidConfigured()) {
    logger.warn('Web Push VAPID is not configured, skipping push notification');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const subscriptions = await prisma.userPushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'WebChat',
    body: payload.body || 'New message',
    icon: payload.avatarUrl || payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    url: payload.url || (payload.chatId ? `/chat/${payload.chatId}` : '/chat'),
    chatId: payload.chatId,
    senderName: payload.senderName,
    tag: payload.tag || payload.chatId || 'webchat-msg',
  });

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload,
          {
            TTL: 60 * 60 * 24, // 24 hours TTL
            urgency: 'high',
          }
        );
        sent++;
      } catch (err: any) {
        failed++;
        // If the subscription is no longer valid (HTTP 410 Gone or 404 Not Found), delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await prisma.userPushSubscription.delete({ where: { id: sub.id } });
            cleaned++;
            logger.info('Removed expired push subscription', { subscriptionId: sub.id, userId });
          } catch (delErr) {
            logger.warn('Error deleting expired push subscription', { error: delErr });
          }
        } else {
          logger.warn('Failed to send push notification to endpoint', {
            statusCode: err.statusCode,
            message: err.message,
            userId,
          });
        }
      }
    })
  );

  return { sent, failed, cleaned };
}

/**
 * Phase 40: Dispatches a high-priority incoming voice call push notification to a user.
 * Urgency is set to 'high' and TTL is restricted to 45s (matching call ringing timeout).
 * Carries inline "Accept" and "Decline" notification actions and 'call_invite' type.
 */
export async function sendIncomingCallPush(
  userId: string,
  payload: IncomingCallPushPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!ensureVapidConfigured()) {
    logger.warn('Web Push VAPID is not configured, skipping call push notification');
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const subscriptions = await prisma.userPushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const notificationPayload = JSON.stringify({
    type: 'call_invite',
    title: payload.title || '📞 Incoming Voice Call',
    body: payload.body || `Incoming voice call from ${payload.callerName || 'a contact'}`,
    callId: payload.callId,
    chatId: payload.chatId,
    callerName: payload.callerName,
    callerAvatar: payload.callerAvatar || '/icons/icon-192x192.png',
    icon: payload.callerAvatar || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `incoming-call-${payload.callId}`,
    requireInteraction: true,
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'decline', title: 'Decline' },
    ],
  });

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload,
          {
            TTL: 45, // 45 seconds matches ringing timeout
            urgency: 'high',
          }
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await prisma.userPushSubscription.delete({ where: { id: sub.id } });
            cleaned++;
            logger.info('Removed expired push subscription during call push', {
              subscriptionId: sub.id,
              userId,
            });
          } catch (delErr) {
            logger.warn('Error deleting expired push subscription', { error: delErr });
          }
        } else {
          logger.warn('Failed to send call push notification to endpoint', {
            statusCode: err.statusCode,
            message: err.message,
            userId,
          });
        }
      }
    })
  );

  return { sent, failed, cleaned };
}

/**
 * Phase 40: Dispatches a high-priority call notification directly to a single PushSubscription.
 */
export async function sendCallPushToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: IncomingCallPushPayload
): Promise<boolean> {
  if (!ensureVapidConfigured()) return false;

  const notificationPayload = JSON.stringify({
    type: 'call_invite',
    title: payload.title || '📞 Incoming Voice Call',
    body: payload.body || `Incoming voice call from ${payload.callerName || 'a contact'}`,
    callId: payload.callId,
    chatId: payload.chatId,
    callerName: payload.callerName,
    callerAvatar: payload.callerAvatar || '/icons/icon-192x192.png',
    icon: payload.callerAvatar || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `incoming-call-${payload.callId}`,
    requireInteraction: true,
    actions: [
      { action: 'accept', title: 'Accept' },
      { action: 'decline', title: 'Decline' },
    ],
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload, {
      TTL: 45,
      urgency: 'high',
    });
    return true;
  } catch (err) {
    logger.warn('Failed to send call push to subscription', { error: err });
    return false;
  }
}
