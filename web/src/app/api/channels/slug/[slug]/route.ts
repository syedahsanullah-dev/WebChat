import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * GET /api/channels/slug/:slug
 * Public channel lookup by customized URL slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const metadata = await prisma.channelMetadata.findUnique({
      where: { publicSlug: slug.toLowerCase() },
      include: {
        chat: {
          select: {
            id: true,
            groupTitle: true,
            groupDescription: true,
            groupAvatarUrl: true,
            createdAt: true,
            lastMessageAt: true,
            participants: true,
          },
        },
      },
    });

    if (!metadata || !metadata.chat) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const authUser = getAuthUserFromRequest(request);
    const isSubscribed = authUser
      ? metadata.chat.participants.some((p) => p.userId === authUser.userId)
      : false;

    return NextResponse.json({
      channel: {
        id: metadata.chat.id,
        title: metadata.chat.groupTitle || 'Channel',
        description: metadata.description || metadata.chat.groupDescription || null,
        avatarUrl: metadata.chat.groupAvatarUrl || null,
        publicSlug: metadata.publicSlug,
        isVerified: metadata.isVerified,
        subscriberCount: metadata.subscriberCount,
        isSubscribed,
        createdAt: metadata.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/channels/slug/[slug]:', error);
    return NextResponse.json({ error: 'Failed to lookup channel' }, { status: 500 });
  }
}
