import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * POST /api/channels/:id/subscribe
 * Follows / subscribes to a channel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.chat.findUnique({
      where: { id, isChannel: true },
      include: {
        participants: {
          where: { userId: authUser.userId },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if already subscribed
    if (channel.participants.length > 0) {
      return NextResponse.json(
        { message: 'Already subscribed to channel', isSubscribed: true },
        { status: 200 }
      );
    }

    // Subscribe user atomically
    await prisma.$transaction([
      prisma.chatParticipant.create({
        data: {
          chatId: id,
          userId: authUser.userId,
          role: 'subscriber',
        },
      }),
      prisma.channelMetadata.update({
        where: { chatId: id },
        data: {
          subscriberCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Subscribed to channel successfully',
      isSubscribed: true,
    });
  } catch (error) {
    console.error('Error in POST /api/channels/[id]/subscribe:', error);
    return NextResponse.json({ error: 'Failed to subscribe to channel' }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/:id/subscribe
 * Unsubscribes / unfollows a channel
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.chat.findUnique({
      where: { id, isChannel: true },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if channel admin is trying to leave their own channel
    if (channel.groupAdminId === authUser.userId) {
      return NextResponse.json(
        { error: 'Channel creator cannot unfollow their own channel' },
        { status: 400 }
      );
    }

    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: id,
          userId: authUser.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { message: 'Not subscribed to channel', isSubscribed: false },
        { status: 200 }
      );
    }

    await prisma.$transaction([
      prisma.chatParticipant.delete({
        where: {
          chatId_userId: {
            chatId: id,
            userId: authUser.userId,
          },
        },
      }),
      prisma.channelMetadata.update({
        where: { chatId: id },
        data: {
          subscriberCount: { decrement: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Unfollowed channel successfully',
      isSubscribed: false,
    });
  } catch (error) {
    console.error('Error in DELETE /api/channels/[id]/subscribe:', error);
    return NextResponse.json({ error: 'Failed to unfollow channel' }, { status: 500 });
  }
}
