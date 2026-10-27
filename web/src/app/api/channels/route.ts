import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { sanitizeSlug } from '@/lib/channelUtils';

/**
 * GET /api/channels
 * Returns user's subscribed channels and recommended public channels
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    // 1. Fetch channels the current user is subscribed to or admin of
    const subscribedChannels = await prisma.chat.findMany({
      where: {
        isChannel: true,
        participants: {
          some: { userId: authUser.userId },
        },
        ...(search
          ? {
              OR: [
                { groupTitle: { contains: search } },
                { groupDescription: { contains: search } },
                { channelMetadata: { publicSlug: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        channelMetadata: true,
        participants: {
          where: { userId: authUser.userId },
          select: { role: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // 2. Fetch recommended/discoverable public channels that user is NOT yet subscribed to
    const subscribedIds = subscribedChannels.map((c) => c.id);
    const discoverableChannels = await prisma.chat.findMany({
      where: {
        isChannel: true,
        id: { notIn: subscribedIds },
        channelMetadata: {
          publicSlug: { not: null },
        },
        ...(search
          ? {
              OR: [
                { groupTitle: { contains: search } },
                { groupDescription: { contains: search } },
                { channelMetadata: { publicSlug: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        channelMetadata: true,
      },
      orderBy: {
        channelMetadata: { subscriberCount: 'desc' },
      },
      take: 15,
    });

    const formatChannel = (c: any, isSubscribed: boolean) => ({
      id: c.id,
      title: c.groupTitle || 'Untitled Channel',
      description: c.groupDescription || c.channelMetadata?.description || null,
      avatarUrl: c.groupAvatarUrl || null,
      publicSlug: c.channelMetadata?.publicSlug || null,
      isVerified: Boolean(c.channelMetadata?.isVerified),
      subscriberCount: c.channelMetadata?.subscriberCount || 0,
      isSubscribed,
      isAdmin: c.groupAdminId === authUser.userId || c.participants?.[0]?.role === 'admin',
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    });

    return NextResponse.json({
      subscribed: subscribedChannels.map((c) => formatChannel(c, true)),
      discoverable: discoverableChannels.map((c) => formatChannel(c, false)),
    });
  } catch (error) {
    console.error('Error in GET /api/channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

/**
 * POST /api/channels
 * Creates a new broadcast announcement channel
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, avatarUrl, slug } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Channel name cannot exceed 50 characters' }, { status: 400 });
    }

    // Process custom or generated slug
    let publicSlug: string | null = null;
    if (slug && typeof slug === 'string' && slug.trim().length > 0) {
      publicSlug = sanitizeSlug(slug);
    } else {
      publicSlug = sanitizeSlug(name);
    }

    // Check slug collision if provided
    if (publicSlug) {
      const existing = await prisma.channelMetadata.findUnique({
        where: { publicSlug },
      });
      if (existing) {
        publicSlug = `${publicSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    // Create channel transaction
    const channel = await prisma.$transaction(async (tx) => {
      const newChat = await tx.chat.create({
        data: {
          isGroup: true,
          isChannel: true,
          groupTitle: name.trim(),
          groupDescription: description ? description.trim().slice(0, 500) : null,
          groupAvatarUrl: avatarUrl || null,
          groupAdminId: authUser.userId,
          participants: {
            create: {
              userId: authUser.userId,
              role: 'admin',
            },
          },
          channelMetadata: {
            create: {
              isBroadcastOnly: true,
              subscriberCount: 1,
              publicSlug,
              description: description ? description.trim().slice(0, 500) : null,
              isVerified: false,
            },
          },
        },
        include: {
          channelMetadata: true,
        },
      });

      return newChat;
    });

    return NextResponse.json(
      {
        channel: {
          id: channel.id,
          title: channel.groupTitle,
          description: channel.groupDescription,
          avatarUrl: channel.groupAvatarUrl,
          publicSlug: channel.channelMetadata?.publicSlug,
          isVerified: channel.channelMetadata?.isVerified || false,
          subscriberCount: channel.channelMetadata?.subscriberCount || 1,
          isSubscribed: true,
          isAdmin: true,
          lastMessageAt: channel.lastMessageAt,
          createdAt: channel.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/channels:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
