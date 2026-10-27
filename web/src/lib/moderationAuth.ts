import { prisma } from './prisma';

export interface SuspensionStatus {
  isSuspended: boolean;
  reason?: string | null;
  suspendedUntil?: string | null;
  isPermanent: boolean;
}

/**
 * Checks if a user is currently suspended.
 * If a temporary suspension has passed its expiration date,
 * automatically lifts the suspension in the database.
 */
export async function checkUserSuspension(user: {
  id: string;
  isSuspended: boolean;
  suspendedUntil?: Date | null;
  suspensionReason?: string | null;
}): Promise<SuspensionStatus> {
  if (!user.isSuspended) {
    return { isSuspended: false, isPermanent: false };
  }

  const now = new Date();

  // If temporary suspension duration has passed, auto-reactivate account
  if (user.suspendedUntil && user.suspendedUntil <= now) {
    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspendedUntil: null,
          suspensionReason: null,
          suspendedById: null,
        },
      })
      .catch(() => {});

    return { isSuspended: false, isPermanent: false };
  }

  return {
    isSuspended: true,
    reason: user.suspensionReason || 'Violation of terms of service',
    suspendedUntil: user.suspendedUntil ? user.suspendedUntil.toISOString() : null,
    isPermanent: !user.suspendedUntil,
  };
}
