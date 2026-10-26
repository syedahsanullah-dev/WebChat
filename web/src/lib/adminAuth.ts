import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getAuthUserFromRequest } from './auth';
import { hasRole } from './rbac';
import { SystemRole } from '@shared/types';

export interface VerifiedAdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  isSuspended: boolean;
}

/**
 * Server-side helper to verify that an API request comes from an authenticated user
 * possessing at least the required system role (default: "ADMIN").
 */
export async function verifyAdminRequest(
  request: NextRequest,
  requiredRole: SystemRole = 'ADMIN'
): Promise<{ user: VerifiedAdminUser } | { response: NextResponse }> {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: Administrative session required' },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      systemRole: true,
      isSuspended: true,
    },
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: User account not found' },
        { status: 401 }
      ),
    };
  }

  if (user.isSuspended) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden: Account is suspended' },
        { status: 403 }
      ),
    };
  }

  const role = (user.systemRole as SystemRole) || 'USER';

  if (!hasRole(role, requiredRole)) {
    return {
      response: NextResponse.json(
        {
          error: `Forbidden: Requires ${requiredRole} privilege level. Your role is ${role}.`,
        },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      ...user,
      systemRole: role,
    },
  };
}
