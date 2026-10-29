import { NextRequest, NextResponse } from 'next/server';
import {
  sendPushToUser,
  sendIncomingCallPush,
  PushNotificationPayload,
  IncomingCallPushPayload,
} from '@/lib/pushService';
import { getAuthUserFromRequest } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorize: Bearer internal secret OR active user session
    const authHeader = req.headers.get('authorization');
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || '';
    let isAuthorized = false;

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === internalSecret) {
      isAuthorized = true;
    } else {
      const authUser = await getAuthUserFromRequest(req);
      if (authUser) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized push dispatcher request' }, { status: 401 });
    }

    const body = await req.json();
    const recipientId = body.recipientId || body.userId;
    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
    }

    // Phase 40: High-Priority Voice Call Push Dispatch
    if (body.type === 'call_invite' || body.callId) {
      const callPayload: IncomingCallPushPayload = {
        callId: body.callId,
        chatId: body.chatId,
        callerName: body.callerName || 'Unknown Caller',
        callerAvatar: body.callerAvatar || null,
        title: body.title,
        body: body.body,
        sdpOffer: body.sdpOffer,
      };

      const result = await sendIncomingCallPush(recipientId, callPayload);
      return NextResponse.json({ success: true, type: 'call_invite', result });
    }

    // Standard Message Push Dispatch
    const payload: PushNotificationPayload = body.payload || body;
    const result = await sendPushToUser(recipientId, payload);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error('Error in POST /api/push/send', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
