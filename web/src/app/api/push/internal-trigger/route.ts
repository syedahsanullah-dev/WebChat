import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser, PushNotificationPayload } from '@/lib/pushService';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Validate internal shared secret
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || '';

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== secret) {
      return NextResponse.json({ error: 'Unauthorized internal call' }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, payload }: { recipientId: string; payload: PushNotificationPayload } = body;

    if (!recipientId || !payload) {
      return NextResponse.json({ error: 'recipientId and payload are required' }, { status: 400 });
    }

    const result = await sendPushToUser(recipientId, payload);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error('Error in POST /api/push/internal-trigger', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
