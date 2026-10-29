import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { computeOutboundSignature } from '@/lib/webhookValidator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ chatId: string; webhookId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, webhookId } = await context.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.chatId !== chatId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.direction === 'OUTBOUND') {
      if (!webhook.targetUrl) {
        return NextResponse.json(
          { error: 'No target URL configured for this outbound webhook' },
          { status: 400 }
        );
      }

      const testPayload = JSON.stringify({
        event: 'test:ping',
        chatId,
        timestamp: new Date().toISOString(),
        data: {
          message: 'Hello from WebChat Outbound Webhook Test!',
          triggeredBy: user.username,
        },
      });

      const signature = computeOutboundSignature(testPayload, webhook.secret);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(webhook.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WebChat-Webhook-Tester/1.0',
            'X-WebChat-Signature': `sha256=${signature}`,
            'X-WebChat-Event': 'test:ping',
          },
          body: testPayload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        await prisma.webhook.update({
          where: { id: webhookId },
          data: { lastFiredAt: new Date() },
        });

        return NextResponse.json({
          success: true,
          status: res.status,
          statusText: res.statusText,
          message: `Outbound test request delivered with status ${res.status}`,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: false,
          error: `Delivery failed: ${fetchErr?.message || fetchErr}`,
        }, { status: 502 });
      }
    } else {
      // INBOUND test: insert a sample test message directly into chat
      const botMessage = await prisma.message.create({
        data: {
          chatId,
          senderId: webhook.creatorId,
          messageType: 'system_bot',
          content: `🤖 **Webhook Test**: Verification ping successful for **${webhook.name}**!`,
        },
      });

      await prisma.webhook.update({
        where: { id: webhookId },
        data: { lastFiredAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Inbound test message successfully injected into chat',
        botMessage,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
