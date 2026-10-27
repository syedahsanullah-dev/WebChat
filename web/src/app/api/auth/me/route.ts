import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { checkUserSuspension } from '@/lib/moderationAuth';

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: No active session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        avatarUrl: true,
        about: true,
        systemRole: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionReason: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    if (user.isSuspended) {
      const suspension = await checkUserSuspension(user as any);
      if (suspension.isSuspended) {
        return NextResponse.json(
          {
            error: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended by an administrator.',
            reason: suspension.reason,
            suspendedUntil: suspension.suspendedUntil,
            isPermanent: suspension.isPermanent,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching user profile' },
      { status: 500 }
    );
  }
}
