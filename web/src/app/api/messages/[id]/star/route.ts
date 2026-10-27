import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * POST /api/messages/:id/star
 * Star a message as a personal bookmark
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

    const { id: messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const starred = await prisma.starredMessage.upsert({
      where: {
        userId_messageId: {
          userId: authUser.userId,
          messageId,
        },
      },
      create: {
        userId: authUser.userId,
        messageId,
      },
      update: {
        starredAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      starred: true,
      messageId,
      starredAt: starred.starredAt.toISOString(),
    });
  } catch (error) {
    console.error('Error starring message:', error);
    return NextResponse.json({ error: 'Failed to star message' }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/:id/star
 * Remove a message from personal bookmarks
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

    const { id: messageId } = await params;

    await prisma.starredMessage.deleteMany({
      where: {
        userId: authUser.userId,
        messageId,
      },
    });

    return NextResponse.json({
      success: true,
      starred: false,
      messageId,
    });
  } catch (error) {
    console.error('Error unstarring message:', error);
    return NextResponse.json({ error: 'Failed to unstar message' }, { status: 500 });
  }
}
