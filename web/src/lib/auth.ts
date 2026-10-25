import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
}

export const AUTH_COOKIE_NAME = 'auth_token';
const DEFAULT_JWT_SECRET = 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

/**
 * Signs a JWT with 7-day expiration
 */
export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d',
  });
}

/**
 * Verifies a JWT token safely without throwing
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as AuthTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attaches the HTTP-only auth cookie to a NextResponse
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clears the auth cookie from a NextResponse
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Extracts auth token from cookies or Authorization Bearer header
 */
export function getAuthTokenFromRequest(request: Request | NextRequest): string | null {
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    const cookie = request.cookies.get(AUTH_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  }

  // Fallback to Cookie header parsing
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (match) {
      return decodeURIComponent(match.split('=')[1]);
    }
  }

  // Fallback to Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Extracts and verifies current user payload from request
 */
export function getAuthUserFromRequest(request: Request | NextRequest): AuthTokenPayload | null {
  const token = getAuthTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
