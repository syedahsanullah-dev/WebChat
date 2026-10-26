import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { chatId } = await params;

    // Verify user is a participant of this chat
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: authUser.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const calls = await prisma.callLog.findMany({
      where: { chatId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        caller: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ calls }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch call logs' }, { status: 500 });
  }
}
