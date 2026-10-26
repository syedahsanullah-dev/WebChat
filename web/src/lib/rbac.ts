import { SystemRole } from '@shared/types';

export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 1,
};

export const ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  MODERATOR: 'Moderator',
  USER: 'Standard User',
};

export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  SUPER_ADMIN: 'Full root access to all system administration, telemetry, role assignment, and maintenance operations.',
  ADMIN: 'Administrative privileges including user management, storage governance, and system broadcasts.',
  MODERATOR: 'Content moderation privileges to review abuse reports, delete flagged messages, and mute violators.',
  USER: 'Standard access to direct messaging, audio calling, groups, channels, and personal settings.',
};

/**
 * Checks if a user's role meets or exceeds the required role in the hierarchy
 */
export function hasRole(
  userRole: string | undefined | null,
  requiredRole: SystemRole
): boolean {
  if (!userRole) return false;
  const role = (userRole.toUpperCase() as SystemRole);
  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Verifies if an actor can assign or revoke a target role
 * Rule: Actor hierarchy level must be greater than target role level (SUPER_ADMIN can assign any role)
 */
export function canManageRole(
  actorRole: string | undefined | null,
  targetRole: SystemRole
): boolean {
  if (!actorRole) return false;
  const actor = actorRole.toUpperCase() as SystemRole;
  if (actor === 'SUPER_ADMIN') return true;

  const actorLevel = ROLE_HIERARCHY[actor] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;

  return actorLevel > targetLevel;
}
