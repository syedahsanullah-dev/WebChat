import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q')?.trim() || '';

    // If query is empty, return empty list
    if (!rawQuery) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const isHandleSearch = rawQuery.startsWith('@');
    const cleanQuery = isHandleSearch ? rawQuery.slice(1).toLowerCase().trim() : rawQuery.toLowerCase().trim();

    if (!cleanQuery) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // Build Prisma query condition
    const searchConditions = isHandleSearch
      ? [
          {
            username: {
              startsWith: cleanQuery,
            },
          },
        ]
      : [
          {
            username: {
              startsWith: cleanQuery,
            },
          },
          {
            email: {
              startsWith: cleanQuery,
            },
          },
          {
            displayName: {
              contains: cleanQuery,
            },
          },
        ];

    // Find users matching query, excluding self
    const matchedUsers = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: currentUser.userId,
            },
          },
          {
            OR: searchConditions,
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        lastSeen: true,
      },
      take: 15,
      orderBy: {
        username: 'asc',
      },
    });

    if (matchedUsers.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const matchedUserIds = matchedUsers.map((u) => u.id);

    // 1. Fetch existing contacts for these users
    const existingContacts = await prisma.contact.findMany({
      where: {
        userId: currentUser.userId,
        contactUserId: {
          in: matchedUserIds,
        },
      },
      select: {
        id: true,
        contactUserId: true,
        aliasName: true,
      },
    });

    const contactMap = new Map(
      existingContacts.map((c) => [c.contactUserId, c])
    );

    // 2. Fetch direct chats between currentUser and each matchedUser
    const directChats = await prisma.chat.findMany({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: {
                userId: currentUser.userId,
              },
            },
          },
          {
            participants: {
              some: {
                userId: {
                  in: matchedUserIds,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Map other participant user ID -> chatId
    const directChatMap = new Map<string, string>();
    for (const chat of directChats) {
      const otherParticipant = chat.participants.find(
        (p) => p.userId !== currentUser.userId
      );
      if (otherParticipant) {
        directChatMap.set(otherParticipant.userId, chat.id);
      }
    }

    // Merge metadata
    const results = matchedUsers.map((user) => {
      const contactInfo = contactMap.get(user.id);
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        about: user.about,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isContact: !!contactInfo,
        aliasName: contactInfo?.aliasName || null,
        contactId: contactInfo?.id || null,
        existingChatId: directChatMap.get(user.id) || null,
      };
    });

    return NextResponse.json({ users: results }, { status: 200 });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error searching users' },
      { status: 500 }
    );
  }
}
