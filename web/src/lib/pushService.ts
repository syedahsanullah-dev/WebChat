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

// Initialize VAPID details if environment variables are provided
let isVapidConfigured = false;

export function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@vusigma.com';
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

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
