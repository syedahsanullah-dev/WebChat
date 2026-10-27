import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtEdge, AUTH_COOKIE_NAME, getEdgeJwtSecret } from '@/lib/edge-jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = getEdgeJwtSecret();

  let isAuthenticated = false;
  let userRole: string | undefined;

  if (token) {
    const verified = await verifyJwtEdge(token, secret);
    if (verified) {
      isAuthenticated = true;
      userRole = verified.systemRole;
    }
  }

  const isMaintenanceActive = request.cookies.get('maintenance_active')?.value === 'true';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const isMaintenancePage = pathname === '/maintenance';
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isAuthPath = pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register';
  const isMaintenanceStatusApi = pathname.startsWith('/api/maintenance');
  const isStaticOrInternal =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js';

  // 1. Maintenance Mode Active: block non-admin users
  if (isMaintenanceActive && !isAdmin) {
    if (!isMaintenancePage && !isAdminPath && !isAuthPath && !isMaintenanceStatusApi && !isStaticOrInternal) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Service Unavailable - System is undergoing maintenance' },
          { status: 503 }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  // 2. Maintenance Mode Inactive: redirect visitors away from /maintenance
  if (!isMaintenanceActive && isMaintenancePage) {
    const url = request.nextUrl.clone();
    url.pathname = isAuthenticated ? '/chat' : '/login';
    return NextResponse.redirect(url);
  }

  // 3. Authenticated users should not visit login/register
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtectedPage = pathname.startsWith('/chat');

  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/chat';
    return NextResponse.redirect(url);
  }

  // 4. Unauthenticated users cannot visit protected /chat
  if (!isAuthenticated && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
