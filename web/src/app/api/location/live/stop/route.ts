import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.liveLocationId) {
      return NextResponse.json(
        { error: 'liveLocationId is required' },
        { status: 400 }
      );
    }

    const { liveLocationId } = body;

    const existing = await prisma.liveLocation.findUnique({
      where: { id: liveLocationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Live location not found' }, { status: 404 });
    }

    // Only owner or admin can stop
    if (existing.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this live location session' }, { status: 403 });
    }

    await prisma.liveLocation.update({
      where: { id: liveLocationId },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      liveLocationId,
      chatId: existing.chatId,
    });
  } catch (error: any) {
    console.error('Error stopping live location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to stop live location sharing' },
      { status: 500 }
    );
  }
}
