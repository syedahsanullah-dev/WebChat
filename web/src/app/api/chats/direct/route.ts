import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const currentUserId = authUser.userId;
    const body = await request.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json({ error: 'Cannot create a direct chat with yourself' }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if 1-on-1 direct chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: currentUserId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (existingChat) {
      return NextResponse.json({ chat: existingChat }, { status: 200 });
    }

    // Create new direct 1-on-1 chat
    const newChat = await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: currentUserId, role: 'member' },
            { userId: targetUserId, role: 'member' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ chat: newChat }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chats/direct:', error);
    return NextResponse.json({ error: 'Internal server error creating direct chat' }, { status: 500 });
  }
}
