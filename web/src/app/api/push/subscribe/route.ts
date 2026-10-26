import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription object: endpoint and keys (p256dh, auth) are required' },
        { status: 400 }
      );
    }

    const headerUserAgent = req.headers.get('user-agent') || userAgent || null;

    // Upsert subscription for the user by endpoint
    const subscription = await prisma.userPushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: authUser.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: headerUserAgent ? headerUserAgent.substring(0, 255) : null,
      },
      update: {
        userId: authUser.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: headerUserAgent ? headerUserAgent.substring(0, 255) : null,
        updatedAt: new Date(),
      },
    });

    logger.info('Push subscription registered', {
      userId: authUser.userId,
      subscriptionId: subscription.id,
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/push/subscribe', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
