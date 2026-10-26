import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * POST /api/users/keys
 * Registers or updates the authenticated user's ECDH SPKI public key
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { publicKey, algorithm } = body;

    if (!publicKey || typeof publicKey !== 'string' || !publicKey.trim()) {
      return NextResponse.json({ error: 'publicKey string is required' }, { status: 400 });
    }

    const savedKey = await prisma.userPublicKey.upsert({
      where: { userId: authUser.userId },
      update: {
        publicKey: publicKey.trim(),
        algorithm: algorithm || 'ECDH-P256',
      },
      create: {
        userId: authUser.userId,
        publicKey: publicKey.trim(),
        algorithm: algorithm || 'ECDH-P256',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Public key registered successfully',
        publicKey: savedKey.publicKey,
        algorithm: savedKey.algorithm,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/users/keys:', error);
    return NextResponse.json({ error: 'Internal server error registering public key' }, { status: 500 });
  }
}

/**
 * GET /api/users/keys
 * Retrieves authenticated user's own registered public key
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const keyRecord = await prisma.userPublicKey.findUnique({
      where: { userId: authUser.userId },
    });

    if (!keyRecord) {
      return NextResponse.json({ error: 'Public key not registered yet' }, { status: 404 });
    }

    return NextResponse.json(
      {
        userId: keyRecord.userId,
        publicKey: keyRecord.publicKey,
        algorithm: keyRecord.algorithm,
        createdAt: keyRecord.createdAt,
        updatedAt: keyRecord.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/users/keys:', error);
    return NextResponse.json({ error: 'Internal server error retrieving public key' }, { status: 500 });
  }
}
