import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const currentUserName = authUser.username;

    const body = await request.json();
    const { action, targetUserId } = body;

    if (!action || !targetUserId) {
      return NextResponse.json(
        { error: 'Missing action or targetUserId' },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await prisma.chat.findUnique({
      where: { id: groupId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    if (!group || !group.isGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const requesterParticipant = group.participants.find((p) => p.userId === currentUserId);
    if (!requesterParticipant) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a member of this group' },
        { status: 403 }
      );
    }

    const targetUserRecord = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, displayName: true },
    });

    if (!targetUserRecord) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetDisplayName = targetUserRecord.displayName || `@${targetUserRecord.username}`;
    const requesterDisplayName = `@${currentUserName}`;

    let systemText = '';

    // Handle LEAVE
    if (action === 'leave') {
      if (currentUserId !== targetUserId) {
        return NextResponse.json({ error: 'Cannot force another user to leave' }, { status: 400 });
      }

      await prisma.chatParticipant.delete({
        where: {
          chatId_userId: {
            chatId: groupId,
            userId: currentUserId,
          },
        },
      });

      systemText = `${targetDisplayName} left`;

      // If user was admin and other members exist, promote another member
      if (requesterParticipant.role === 'admin') {
        const remainingMembers = group.participants.filter((p) => p.userId !== currentUserId);
        const hasOtherAdmin = remainingMembers.some((p) => p.role === 'admin');
        if (!hasOtherAdmin && remainingMembers.length > 0) {
          await prisma.chatParticipant.update({
            where: { id: remainingMembers[0].id },
            data: { role: 'admin' },
          });
          await prisma.chat.update({
            where: { id: groupId },
            data: { groupAdminId: remainingMembers[0].userId },
          });
        }
      }
    } else {
      // Actions: 'add', 'remove', 'promote', 'demote' REQUIRE ADMIN PRIVILEGES
      if (requesterParticipant.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Only group admins can perform this action' },
          { status: 403 }
        );
      }

      if (action === 'add') {
        await prisma.chatParticipant.upsert({
          where: {
            chatId_userId: {
              chatId: groupId,
              userId: targetUserId,
            },
          },
          create: {
            chatId: groupId,
            userId: targetUserId,
            role: 'member',
          },
          update: {},
        });
        systemText = `${requesterDisplayName} added ${targetDisplayName}`;
      } else if (action === 'remove') {
        await prisma.chatParticipant.deleteMany({
          where: {
            chatId: groupId,
            userId: targetUserId,
          },
        });
        systemText = `${requesterDisplayName} removed ${targetDisplayName}`;
      } else if (action === 'promote') {
        await prisma.chatParticipant.update({
          where: {
            chatId_userId: {
              chatId: groupId,
              userId: targetUserId,
            },
          },
          data: { role: 'admin' },
        });
        systemText = `${targetDisplayName} is now an admin`;
      } else if (action === 'demote') {
        await prisma.chatParticipant.update({
          where: {
            chatId_userId: {
              chatId: groupId,
              userId: targetUserId,
            },
          },
          data: { role: 'member' },
        });
        systemText = `${targetDisplayName} is no longer an admin`;
      } else {
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    }

    // Insert system notification message
    if (systemText) {
      const systemMessage = await prisma.message.create({
        data: {
          chatId: groupId,
          senderId: currentUserId,
          messageType: 'system',
          content: systemText,
        },
      });

      await prisma.chat.update({
        where: { id: groupId },
        data: {
          lastMessageId: systemMessage.id,
          lastMessageAt: systemMessage.createdAt,
        },
      });
    }

    // Return updated group details
    const updatedGroup = await prisma.chat.findUnique({
      where: { id: groupId },
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
          orderBy: { role: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, group: updatedGroup }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/groups/[groupId]/participants:', error);
    return NextResponse.json(
      { error: 'Internal server error managing group participants' },
      { status: 500 }
    );
  }
}
