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
    if (!body || !body.chatId || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid parameters: chatId, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const {
      chatId,
      latitude,
      longitude,
      durationMinutes = 60,
      comment = null,
      heading = null,
      speed = null,
      accuracy = null,
    } = body;

    // Validate user is a chat participant
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
        { error: 'Forbidden: You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Clamp duration to valid limits: 15m, 60m (1h), 480m (8h)
    const validMinutes = [15, 60, 480].includes(durationMinutes) ? durationMinutes : 60;
    const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000);

    // Deactivate previous active live location sessions for this user in this chat
    await prisma.liveLocation.updateMany({
      where: {
        chatId,
        userId: authUser.userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new LiveLocation
    const liveLocation = await prisma.liveLocation.create({
      data: {
        chatId,
        userId: authUser.userId,
        latitude,
        longitude,
        heading,
        speed,
        accuracy,
        comment: comment ? String(comment).slice(0, 255) : null,
        isActive: true,
        expiresAt,
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
    });

    // Post a message in the chat linking to this live location
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: authUser.userId,
        messageType: 'live_location',
        content: comment || 'Live Location',
        latitude,
        longitude,
        locationAddress: comment || 'Live Location Sharing',
        liveLocationId: liveLocation.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update chat lastMessageAt
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    const formattedLiveLocation = {
      id: liveLocation.id,
      chatId: liveLocation.chatId,
      userId: liveLocation.userId,
      userDisplayName: liveLocation.user.displayName || liveLocation.user.username,
      userAvatarUrl: liveLocation.user.avatarUrl,
      latitude: liveLocation.latitude,
      longitude: liveLocation.longitude,
      heading: liveLocation.heading,
      speed: liveLocation.speed,
      accuracy: liveLocation.accuracy,
      comment: liveLocation.comment,
      isActive: liveLocation.isActive,
      startedAt: liveLocation.startedAt.toISOString(),
      expiresAt: liveLocation.expiresAt.toISOString(),
      updatedAt: liveLocation.updatedAt.toISOString(),
    };

    return NextResponse.json(
      {
        liveLocation: formattedLiveLocation,
        message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error starting live location:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start live location sharing' },
      { status: 500 }
    );
  }
}
