import { prisma } from './prisma';
import crypto from 'crypto';

export interface ParsedDeviceInfo {
  os: string;
  browser: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';
}

/**
 * Lightweight regex-based User-Agent parser (0 external runtime dependencies)
 */
export function parseUserAgent(uaString?: string | null): ParsedDeviceInfo {
  if (!uaString) {
    return {
      os: 'Unknown OS',
      browser: 'Browser',
      deviceType: 'UNKNOWN',
    };
  }

  const ua = uaString.trim();

  // Detect Device Type
  let deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN' = 'DESKTOP';
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) {
    deviceType = 'TABLET';
  } else if (/Mobile|iPhone|iPod|Android|webOS|BlackBerry|IEMobile/i.test(ua)) {
    deviceType = 'MOBILE';
  }

  // Detect OS
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/Chrome\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Firefox';
  }

  return { os, browser, deviceType };
}

/**
 * Extracts client IP from standard reverse proxy headers
 */
export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Creates and persists a new UserSession record in MySQL
 */
export async function createSession(userId: string, request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const ipAddress = extractClientIp(request);
  const parsed = parseUserAgent(userAgent);

  const sessionToken = crypto.randomBytes(32).toString('hex');

  const session = await prisma.userSession.create({
    data: {
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      os: parsed.os,
      lastActiveAt: new Date(),
    },
  });

  return { session, sessionToken };
}

/**
 * Updates lastActiveAt for an existing session
 */
export async function touchSession(sessionToken: string): Promise<void> {
  if (!sessionToken) return;
  try {
    await prisma.userSession.update({
      where: { sessionToken },
      data: { lastActiveAt: new Date() },
    });
  } catch {
    // Non-fatal if session already revoked
  }
}

/**
 * Lists all active sessions for a user with isCurrent flag
 */
export async function getUserSessions(userId: string, currentSessionToken?: string) {
  const sessions = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { lastActiveAt: 'desc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    deviceType: s.deviceType,
    browser: s.browser || 'Browser',
    os: s.os || 'Unknown OS',
    ipAddress: s.ipAddress || '127.0.0.1',
    lastActiveAt: s.lastActiveAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    isCurrent: Boolean(currentSessionToken && s.sessionToken === currentSessionToken),
  }));
}

/**
 * Revokes a specific session
 */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await prisma.userSession.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });
  return result.count > 0;
}

/**
 * Revokes all sessions except the current active one
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  const result = await prisma.userSession.deleteMany({
    where: {
      userId,
      sessionToken: { not: currentSessionToken },
    },
  });
  return result.count;
}
