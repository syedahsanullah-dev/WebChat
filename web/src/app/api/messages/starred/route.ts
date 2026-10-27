import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * GET /api/messages/starred
 * Fetch all starred message bookmarks for the current user across chats
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    const starredList = await prisma.starredMessage.findMany({
      where: {
        userId: authUser.userId,
        ...(searchQuery
          ? {
              message: {
                content: {
                  contains: searchQuery,
                },
              },
            }
          : {}),
      },
      orderBy: { starredAt: 'desc' },
      take: 50,
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            chat: {
              select: {
                id: true,
                isGroup: true,
                isChannel: true,
                groupTitle: true,
                groupAvatarUrl: true,
                participants: {
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
                },
              },
            },
          },
        },
      },
    });

    const formattedStarred = starredList.map((star) => {
      const msg = star.message;
      let chatTitle = 'Chat';
      let chatAvatar: string | null = null;

      if (msg.chat.isGroup || msg.chat.isChannel) {
        chatTitle = msg.chat.groupTitle || 'Group Chat';
        chatAvatar = msg.chat.groupAvatarUrl;
      } else {
        const otherParticipant = msg.chat.participants.find(
          (p) => p.user.id !== authUser.userId
        );
        if (otherParticipant) {
          chatTitle = otherParticipant.user.displayName || otherParticipant.user.username;
          chatAvatar = otherParticipant.user.avatarUrl;
        }
      }

      return {
        id: star.id,
        messageId: msg.id,
        chatId: msg.chatId,
        chatTitle,
        chatAvatar,
        senderId: msg.senderId,
        senderName: msg.sender.displayName || msg.sender.username,
        senderAvatar: msg.sender.avatarUrl,
        content: msg.isDeleted ? 'This message was deleted' : msg.content,
        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl,
        starredAt: star.starredAt.toISOString(),
        createdAt: msg.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ starred: formattedStarred });
  } catch (error) {
    console.error('Error fetching starred messages:', error);
    return NextResponse.json({ error: 'Failed to fetch starred messages' }, { status: 500 });
  }
}
