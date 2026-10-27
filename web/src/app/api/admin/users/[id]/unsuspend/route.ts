import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';

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

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isSuspended: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        suspendedById: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        isSuspended: true,
      },
    });

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'USER_UNSUSPENDED',
        resource: `User:${id}`,
        ipAddress,
        metadata: JSON.stringify({
          targetUserId: id,
          targetUsername: existingUser.username,
        }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `User @${existingUser.username} has been unsuspended`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/users/[id]/unsuspend:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to unsuspend user' },
      { status: 500 }
    );
  }
}
