import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { groupId } = await params;
    const currentUserId = authUser.userId;

    const group = await prisma.chat.findUnique({
      where: { id: groupId },
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
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
          orderBy: { role: 'asc' }, // Admins first
        },
      },
    });

    if (!group || !group.isGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if requester is participant
    const isParticipant = group.participants.some((p) => p.userId === currentUserId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this group' }, { status: 403 });
    }

    return NextResponse.json({ group }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/groups/[groupId]:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching group' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { groupId } = await params;
    const currentUserId = authUser.userId;

    // Check if user is an admin of the group
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: groupId,
          userId: currentUserId,
        },
      },
    });

    if (!participant || participant.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only group admins can modify group settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, avatarUrl } = body;

    const updateData: any = {};
    if (typeof title === 'string' && title.trim()) {
      updateData.groupTitle = title.trim();
    }
    if (description !== undefined) {
      updateData.groupDescription = description ? description.trim() : null;
    }
    if (avatarUrl !== undefined) {
      updateData.groupAvatarUrl = avatarUrl;
    }

    const updated = await prisma.chat.update({
      where: { id: groupId },
      data: updateData,
    });

    return NextResponse.json({ group: updated }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/groups/[groupId]:', error);
    return NextResponse.json(
      { error: 'Internal server error updating group' },
      { status: 500 }
    );
  }
}
