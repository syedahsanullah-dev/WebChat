import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/broadcasts/active
 * Public / client application mount endpoint to fetch the current active broadcast
 */
export async function GET(_request: NextRequest) {
  try {
    const activeBroadcast = await prisma.systemBroadcast.findFirst({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      broadcast: activeBroadcast
        ? {
            id: activeBroadcast.id,
            message: activeBroadcast.message,
            severity: activeBroadcast.severity,
            createdAt: activeBroadcast.createdAt.toISOString(),
            expiresAt: activeBroadcast.expiresAt ? activeBroadcast.expiresAt.toISOString() : null,
            creatorName: activeBroadcast.creator?.displayName || `@${activeBroadcast.creator?.username}`,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch active broadcast', details: (error as Error).message },
      { status: 500 }
    );
  }
}
