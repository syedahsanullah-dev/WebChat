import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callId, reason = 'declined' } = body;

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    // 1. Update CallLog if already created
    try {
      const existing = await prisma.callLog.findUnique({ where: { id: callId } });
      if (existing) {
        await prisma.callLog.update({
          where: { id: callId },
          data: { status: 'rejected', endedAt: new Date() },
        });
      }
    } catch (dbErr) {
      logger.warn('[CallRejectApi] Error updating CallLog:', { error: dbErr });
    }

    // 2. Notify Fastify Socket Server #2 internal endpoint to clear active session and inform caller
    const socketServerUrl =
      process.env.SOCKET_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      'http://127.0.0.1:4000';
    try {
      const internalUrl = socketServerUrl.startsWith('ws')
        ? socketServerUrl.replace(/^ws/, 'http')
        : socketServerUrl;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 2000) : null;
      await fetch(`${internalUrl}/internal/call-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, reason }),
        signal: controller?.signal,
      })
        .catch((err) => {
          logger.debug('[CallRejectApi] Server #2 internal call-reject notify non-fatal error:', err);
        })
        .finally(() => {
          if (timer) clearTimeout(timer);
        });
    } catch (relayErr) {
      logger.debug('[CallRejectApi] Relay to Server #2 failed:', relayErr);
    }

    return NextResponse.json({ success: true, callId, status: 'rejected' });
  } catch (error) {
    logger.error('Error in POST /api/calls/reject', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
