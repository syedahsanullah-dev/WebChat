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
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const { chatId } = await params;

    // Verify user is chat participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: authUser.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a participant in this chat' },
        { status: 403 }
      );
    }

    const now = new Date();
    const liveLocations = await prisma.liveLocation.findMany({
      where: {
        chatId,
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const formatted = liveLocations.map((loc) => ({
      id: loc.id,
      chatId: loc.chatId,
      userId: loc.userId,
      userDisplayName: loc.user.displayName || loc.user.username,
      userAvatarUrl: loc.user.avatarUrl,
      latitude: loc.latitude,
      longitude: loc.longitude,
      heading: loc.heading,
      speed: loc.speed,
      accuracy: loc.accuracy,
      comment: loc.comment,
      isActive: loc.isActive,
      startedAt: loc.startedAt.toISOString(),
      expiresAt: loc.expiresAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    }));

    return NextResponse.json({ liveLocations: formatted });
  } catch (error: any) {
    console.error('Error fetching live locations:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch live locations' },
      { status: 500 }
    );
  }
}
