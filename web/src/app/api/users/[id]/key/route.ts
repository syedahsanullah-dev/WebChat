import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * GET /api/users/[id]/key
 * Fetches the public key of a specific user by their userId or @username
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'User identifier is required' }, { status: 400 });
    }

    // Try finding by userId first
    let keyRecord = await prisma.userPublicKey.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // If not found by direct userId, check if identifier is a username
    if (!keyRecord) {
      const cleanUsername = id.replace(/^@/, '');
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
        select: {
          id: true,
          username: true,
          displayName: true,
          publicKey: true,
        },
      });

      if (user?.publicKey) {
        keyRecord = {
          ...user.publicKey,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
          },
        };
      }
    }

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Public key not found for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        userId: keyRecord.userId,
        publicKey: keyRecord.publicKey,
        algorithm: keyRecord.algorithm,
        createdAt: keyRecord.createdAt,
        user: keyRecord.user
          ? {
              id: keyRecord.user.id,
              username: keyRecord.user.username,
              displayName: keyRecord.user.displayName,
            }
          : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/users/[id]/key:', error);
    return NextResponse.json({ error: 'Internal server error fetching public key' }, { status: 500 });
  }
}
