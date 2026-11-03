import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const currentUserId = authUser.userId;

    // Fetch all contacts to resolve aliases
    const contacts = await prisma.contact.findMany({
      where: { userId: currentUserId },
      select: { contactUserId: true, aliasName: true },
    });
    const aliasMap = new Map<string, string>();
    contacts.forEach((c) => {
      if (c.aliasName) aliasMap.set(c.contactUserId, c.aliasName);
    });

    // Fetch user chats sorted by lastMessageAt DESC
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId: currentUserId },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
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
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            statuses: {
              where: { userId: currentUserId },
              select: { status: true },
            },
          },
        },
        channelMetadata: true,
      },
    });

    // Helper to format snippet preview for different message types
    const formatMessagePreview = (msg: any) => {
      if (!msg) return '';
      switch (msg.messageType) {
        case 'system':
          return msg.content || '';
        case 'image':
          return '📷 Photo';
        case 'voice':
          return '🎤 Voice note';
        case 'document':
          return `📄 ${msg.documentName || 'Document'}`;
        case 'location':
          return '📍 Location';
        case 'live_location':
          return '📍 Live location';
        case 'poll':
          return '📊 Poll';
        default:
          return msg.content || '';
      }
    };

    // Calculate unread count for each chat
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        const participantRecord = chat.participants.find((p) => p.userId === currentUserId);
        const lastReadAt = participantRecord?.lastReadAt || new Date(0);

        // Count unread incoming messages
        const unreadCount = await prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: currentUserId },
            createdAt: { gt: lastReadAt },
          },
        });

        // Check if channel or group conversation or 1-on-1 direct chat
        if (chat.isGroup || chat.isChannel) {
          const latestMsg = chat.messages[0] || null;
          const isAdmin =
            chat.groupAdminId === currentUserId ||
            participantRecord?.role === 'admin';

          return {
            id: chat.id,
            isGroup: chat.isGroup,
            isChannel: Boolean(chat.isChannel),
            isChannelAdmin: isAdmin,
            channelMetadata: chat.channelMetadata || null,
            name: chat.groupTitle || (chat.isChannel ? 'Broadcast Channel' : 'Group Chat'),
            username: chat.channelMetadata?.publicSlug ? `@${chat.channelMetadata.publicSlug}` : '',
            avatar: chat.groupAvatarUrl,
            groupDescription: chat.channelMetadata?.description || chat.groupDescription,
            groupAdminId: chat.groupAdminId,
            otherUser: null,
            lastMessage: formatMessagePreview(latestMsg),
            lastMessageSenderId: latestMsg ? latestMsg.senderId : null,
            lastMessageAt: chat.lastMessageAt.toISOString(),
            isE2EE: latestMsg ? Boolean(latestMsg.isE2EE) : false,
            e2eeIv: latestMsg ? latestMsg.e2eeIv || null : null,
            unreadCount,
            isOnline: false,
            ephemeralDuration: chat.ephemeralDuration ?? null,
          };
        }

        // 1-on-1 contact user
        const otherParticipant = chat.participants.find((p) => p.userId !== currentUserId);
        const otherUser = otherParticipant?.user;

        const effectiveDisplayName = otherUser
          ? aliasMap.get(otherUser.id) || otherUser.displayName
          : 'User';

        const latestMsg = chat.messages[0] || null;

        return {
          id: chat.id,
          isGroup: false,
          name: effectiveDisplayName,
          username: otherUser ? `@${otherUser.username}` : '',
          avatar: otherUser ? otherUser.avatarUrl : null,
          otherUser: otherUser
            ? {
                id: otherUser.id,
                username: otherUser.username,
                displayName: effectiveDisplayName,
                avatarUrl: otherUser.avatarUrl,
                isOnline: otherUser.isOnline,
                lastSeen: otherUser.lastSeen,
              }
            : null,
          lastMessage: formatMessagePreview(latestMsg),
          lastMessageSenderId: latestMsg ? latestMsg.senderId : null,
          lastMessageAt: chat.lastMessageAt.toISOString(),
          isE2EE: latestMsg ? Boolean(latestMsg.isE2EE) : false,
          e2eeIv: latestMsg ? latestMsg.e2eeIv || null : null,
          unreadCount,
          isOnline: otherUser ? otherUser.isOnline : false,
          ephemeralDuration: chat.ephemeralDuration ?? null,
        };
      })
    );

    return NextResponse.json({ chats: formattedChats }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/chats:', error);
    return NextResponse.json({ error: 'Internal server error fetching chats' }, { status: 500 });
  }
}
