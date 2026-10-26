import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const currentUserId = authUser.userId;
    const body = await request.json();
    const { title, description, avatarUrl, participantIds = [] } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Group title is required' }, { status: 400 });
    }

    // Deduplicate and filter out current user from participantIds
    const distinctParticipantIds = Array.from(
      new Set(
        participantIds.filter(
          (id: string) => typeof id === 'string' && id && id !== currentUserId
        )
      )
    ) as string[];

    // Create Group Chat and members transactionally
    const groupChat = await prisma.$transaction(async (tx) => {
      // 1. Create group chat
      const chat = await tx.chat.create({
        data: {
          isGroup: true,
          groupTitle: title.trim(),
          groupDescription: description?.trim() || null,
          groupAvatarUrl: avatarUrl || null,
          groupAdminId: currentUserId,
        },
      });

      // 2. Add creator as admin
      await tx.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId: currentUserId,
          role: 'admin',
        },
      });

      // 3. Add members
      if (distinctParticipantIds.length > 0) {
        await tx.chatParticipant.createMany({
          data: distinctParticipantIds.map((userId) => ({
            chatId: chat.id,
            userId,
            role: 'member',
          })),
          skipDuplicates: true,
        });
      }

      // 4. Create initial system announcement message
      const systemMsg = await tx.message.create({
        data: {
          chatId: chat.id,
          senderId: currentUserId,
          messageType: 'system',
          content: `You created group "${title.trim()}"`,
        },
      });

      // Update chat last message
      await tx.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: systemMsg.id,
          lastMessageAt: systemMsg.createdAt,
        },
      });

      return chat;
    });

    // Fetch full group chat record with participants
    const fullGroup = await prisma.chat.findUnique({
      where: { id: groupChat.id },
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

    return NextResponse.json({ group: fullGroup }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/groups:', error);
    return NextResponse.json(
      { error: 'Internal server error creating group' },
      { status: 500 }
    );
  }
}
