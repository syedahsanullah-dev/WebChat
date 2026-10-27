import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { sanitizeSlug } from '@/lib/channelUtils';

export async function GET(
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
        channelMetadata: true,
        participants: {
          where: { userId: authUser.userId },
        },
        admin: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const isSubscribed = channel.participants.length > 0;
    const isAdmin =
      channel.groupAdminId === authUser.userId ||
      channel.participants.some((p) => p.role === 'admin');

    return NextResponse.json({
      channel: {
        id: channel.id,
        title: channel.groupTitle || 'Untitled Channel',
        description: channel.groupDescription || channel.channelMetadata?.description || null,
        avatarUrl: channel.groupAvatarUrl || null,
        publicSlug: channel.channelMetadata?.publicSlug || null,
        isVerified: Boolean(channel.channelMetadata?.isVerified),
        subscriberCount: channel.channelMetadata?.subscriberCount || 0,
        isBroadcastOnly: channel.channelMetadata?.isBroadcastOnly ?? true,
        isSubscribed,
        isAdmin,
        admin: channel.admin,
        createdAt: channel.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/channels/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch channel details' }, { status: 500 });
  }
}

export async function PATCH(
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

    const isAdmin =
      channel.groupAdminId === authUser.userId ||
      channel.participants.some((p) => p.role === 'admin');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only channel admins can modify settings' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, avatarUrl, slug } = body;

    const dataToUpdate: any = {};
    if (name && typeof name === 'string') dataToUpdate.groupTitle = name.trim().slice(0, 50);
    if (description !== undefined) dataToUpdate.groupDescription = description?.trim().slice(0, 500) || null;
    if (avatarUrl !== undefined) dataToUpdate.groupAvatarUrl = avatarUrl || null;

    const updated = await prisma.chat.update({
      where: { id },
      data: dataToUpdate,
      include: { channelMetadata: true },
    });

    if (slug && typeof slug === 'string') {
      const cleanSlug = sanitizeSlug(slug);
      await prisma.channelMetadata.upsert({
        where: { chatId: id },
        create: {
          chatId: id,
          publicSlug: cleanSlug,
        },
        update: {
          publicSlug: cleanSlug,
        },
      });
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: updated.id,
        title: updated.groupTitle,
        description: updated.groupDescription,
        avatarUrl: updated.groupAvatarUrl,
        publicSlug: updated.channelMetadata?.publicSlug,
        isVerified: updated.channelMetadata?.isVerified || false,
        subscriberCount: updated.channelMetadata?.subscriberCount || 0,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/channels/[id]:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}
