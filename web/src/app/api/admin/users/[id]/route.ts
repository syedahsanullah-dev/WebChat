import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { SystemRole } from '@shared/types';

/**
 * GET /api/admin/users/[id]
 * Returns extensive profile details, statistics, active sessions, and audit history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'MODERATOR');
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        about: true,
        systemRole: true,
        isSuspended: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          orderBy: { lastActiveAt: 'desc' },
          take: 10,
          select: {
            id: true,
            deviceType: true,
            browser: true,
            os: true,
            ipAddress: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            action: true,
            resource: true,
            metadata: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            sentMessages: true,
            initiatedCalls: true,
            receivedCalls: true,
            chatParticipants: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = (user.systemRole as SystemRole) || 'USER';
    const stats = {
      totalSentMessages: user._count?.sentMessages || 0,
      totalMediaSent: 0,
      chatParticipantsCount: user._count?.chatParticipants || 0,
      activeSessionsCount: user._count?.sessions || 0,
    };

    const userPayload = {
      ...user,
      systemRole: userRole,
      stats,
    };

    return NextResponse.json(
      {
        ...userPayload,
        user: userPayload,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching user details' },
      { status: 500 }
    );
  }
}
