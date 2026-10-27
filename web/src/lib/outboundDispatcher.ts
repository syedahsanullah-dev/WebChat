import { prisma } from '@/lib/prisma';
import { computeOutboundSignature } from './webhookValidator';
import { logger } from './logger';

export interface OutboundEventPayload {
  event: string;
  chatId: string;
  timestamp: string;
  data: any;
}

/**
 * Dispatches chat events to registered active OUTBOUND webhooks for the chat.
 * Runs non-blocking with 5s timeout and HMAC SHA-256 header.
 */
export async function dispatchOutboundWebhooks(
  chatId: string,
  event: string,
  data: any
): Promise<number> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        chatId,
        direction: 'OUTBOUND',
        isActive: true,
      },
    });

    if (!webhooks || webhooks.length === 0) {
      return 0;
    }

    const payload: OutboundEventPayload = {
      event,
      chatId,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Fire non-blocking requests in parallel
    const promises = webhooks.map(async (webhook) => {
      if (!webhook.targetUrl) return;

      const signature = computeOutboundSignature(payloadString, webhook.secret);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(webhook.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WebChat-Webhook-Dispatcher/1.0',
            'X-WebChat-Signature': `sha256=${signature}`,
            'X-WebChat-Event': event,
            'X-WebChat-Delivery': webhook.id,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: { lastFiredAt: new Date() },
          }).catch(() => {});
        } else {
          logger.warn(`Outbound webhook ${webhook.id} returned status ${response.status}`);
        }
      } catch (err: any) {
        logger.warn(`Failed to dispatch outbound webhook ${webhook.id}: ${err?.message || err}`);
      }
    });

    // Don't throw if one fails
    Promise.allSettled(promises).catch(() => {});
    return webhooks.length;
  } catch (err: any) {
    logger.error('Error fetching outbound webhooks:', err);
    return 0;
  }
}
