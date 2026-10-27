import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string; webhookId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId, webhookId } = await context.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.chatId !== chatId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify permission: creator, group admin, or super admin
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: user.id },
    });

    const isAuthorized =
      webhook.creatorId === user.id ||
      participant?.role === 'admin' ||
      user.systemRole === 'SUPER_ADMIN';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: any = {};

    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive;
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 100);
    }

    if (typeof body.targetUrl === 'string') {
      updateData.targetUrl = body.targetUrl.trim();
    }

    if (body.regenerateSecret) {
      updateData.secret = crypto.randomBytes(32).toString('hex');
    }

    if (body.regenerateToken) {
      updateData.token = crypto.randomBytes(32).toString('hex');
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: updateData,
    });

    const host = request.headers.get('host') || 'chat.vusigma.com';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      webhook: {
        ...updated,
        incomingUrl:
          updated.direction === 'INBOUND'
            ? `${baseUrl}/api/webhooks/incoming/${updated.token}`
            : undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId, webhookId } = await context.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.chatId !== chatId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: user.id },
    });

    const isAuthorized =
      webhook.creatorId === user.id ||
      participant?.role === 'admin' ||
      user.systemRole === 'SUPER_ADMIN';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
