import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { ROLE_HIERARCHY } from '@/lib/rbac';
import { SystemRole } from '@shared/types';

export type SuspensionDuration = '24H' | '7D' | '30D' | 'PERMANENT';

export async function POST(
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

  if (auth.user.id === id) {
    return NextResponse.json(
      { error: 'You cannot suspend your own account' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { reason, duration } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'A mandatory suspension reason of at least 5 characters is required' },
        { status: 400 }
      );
    }

    const validDurations: SuspensionDuration[] = ['24H', '7D', '30D', 'PERMANENT'];
    const chosenDuration = (duration?.toUpperCase() || 'PERMANENT') as SuspensionDuration;

    if (!validDurations.includes(chosenDuration)) {
      return NextResponse.json(
        { error: `Invalid duration. Must be one of: ${validDurations.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate expiration timestamp
    let suspendedUntil: Date | null = null;
    const now = Date.now();
    if (chosenDuration === '24H') {
      suspendedUntil = new Date(now + 24 * 60 * 60 * 1000);
    } else if (chosenDuration === '7D') {
      suspendedUntil = new Date(now + 7 * 24 * 60 * 60 * 1000);
    } else if (chosenDuration === '30D') {
      suspendedUntil = new Date(now + 30 * 24 * 60 * 60 * 1000);
    } else {
      suspendedUntil = null; // Permanent
    }

    // Fetch existing user to verify hierarchy
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, systemRole: true, isSuspended: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetRole = (existingUser.systemRole as SystemRole) || 'USER';

    // Hierarchy protection: actor cannot suspend someone of equal or higher rank unless SUPER_ADMIN
    if (
      auth.user.systemRole !== 'SUPER_ADMIN' &&
      (ROLE_HIERARCHY[targetRole] ?? 0) >= (ROLE_HIERARCHY[auth.user.systemRole] ?? 0)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot suspend an administrator with equal or higher rank.' },
        { status: 403 }
      );
    }

    // 1. Update User record in database
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedUntil,
        suspensionReason: reason.trim(),
        suspendedById: auth.user.id,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionReason: true,
      },
    });

    // 2. Invalidate all active sessions for the suspended user
    await prisma.userSession.deleteMany({
      where: { userId: id },
    }).catch(() => {});

    // 3. Record immutable audit log
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'USER_SUSPENDED',
        resource: `User:${id}`,
        ipAddress,
        metadata: JSON.stringify({
          targetUserId: id,
          targetUsername: existingUser.username,
          duration: chosenDuration,
          suspendedUntil: suspendedUntil?.toISOString() || null,
          reason: reason.trim(),
        }),
      },
    }).catch(() => {});

    // 4. Force disconnect active WebSockets via Fastify Server #2 (< 50ms)
    try {
      const socketServerUrl =
        process.env.INTERNAL_SOCKET_URL ||
        process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
        'http://127.0.0.1:4000';

      fetch(`${socketServerUrl}/internal/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          reason: reason.trim(),
          suspendedUntil: suspendedUntil ? suspendedUntil.toISOString() : null,
        }),
      }).catch((e) => {
        console.debug('Non-fatal socket kick forward error:', e.message);
      });
    } catch {
      // Swallowed safely
    }

    return NextResponse.json({
      success: true,
      message: `User @${existingUser.username} has been suspended`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/users/[id]/suspend:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to suspend user' },
      { status: 500 }
    );
  }
}
