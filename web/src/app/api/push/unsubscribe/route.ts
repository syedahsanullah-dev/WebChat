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
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    await prisma.userPushSubscription.deleteMany({
      where: {
        userId: authUser.userId,
        endpoint,
      },
    });

    logger.info('Push subscription removed', {
      userId: authUser.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in POST /api/push/unsubscribe', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
