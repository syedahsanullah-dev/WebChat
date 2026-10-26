import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { canManageRole, ROLE_HIERARCHY } from '@/lib/rbac';
import { SystemRole } from '@shared/types';

const VALID_ROLES: SystemRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];

/**
 * PATCH /api/admin/users/[id]/role
 * Role delegation endpoint for elevating or demoting user permissions.
 * Protects role hierarchy: Only SUPER_ADMIN can assign ADMIN or SUPER_ADMIN.
 * Enforces mandatory audit logging with admin justification reason.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request, 'ADMIN');
  if ('response' in auth) {
    return auth.response;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Prevent modifying own role
  if (auth.user.id === id) {
    return NextResponse.json(
      { error: 'Cannot modify your own administrative role' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { role, reason } = body;

    const targetRole = role?.toUpperCase() as SystemRole;

    if (!targetRole || !VALID_ROLES.includes(targetRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 4) {
      return NextResponse.json(
        { error: 'A justification reason of at least 4 characters is mandatory for audit logging' },
        { status: 400 }
      );
    }

    // Check if actor has permission to assign this role
    if (!canManageRole(auth.user.systemRole, targetRole)) {
      return NextResponse.json(
        {
          error: `Forbidden: As ${auth.user.systemRole}, you do not have permission to grant the ${targetRole} role. Only Super Administrators can grant Admin privileges.`,
        },
        { status: 403 }
      );
    }

    // Fetch existing user to check current role
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, systemRole: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const currentRole = (existingUser.systemRole as SystemRole) || 'USER';

    // Cannot demote someone of equal or higher hierarchy rank unless actor is SUPER_ADMIN
    if (
      auth.user.systemRole !== 'SUPER_ADMIN' &&
      (ROLE_HIERARCHY[currentRole] ?? 0) >= (ROLE_HIERARCHY[auth.user.systemRole] ?? 0)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot modify the role of an administrator with equal or higher rank.' },
        { status: 403 }
      );
    }

    // Update target user's role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { systemRole: targetRole },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        systemRole: true,
      },
    });

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Record audit event
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'USER_ROLE_ELEVATED',
        resource: `User:${id}`,
        ipAddress,
        metadata: JSON.stringify({
          targetUserId: id,
          targetUsername: existingUser.username,
          previousRole: currentRole,
          newRole: targetRole,
          reason: reason.trim(),
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Updated role for @${existingUser.username} from ${currentRole} to ${targetRole}`,
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/admin/users/[id]/role:', error);
    return NextResponse.json(
      { error: 'Internal server error updating user role' },
      { status: 500 }
    );
  }
}
