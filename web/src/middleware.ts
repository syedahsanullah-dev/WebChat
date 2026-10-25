import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtEdge, AUTH_COOKIE_NAME, getEdgeJwtSecret } from '@/lib/edge-jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = getEdgeJwtSecret();

  let isAuthenticated = false;
  if (token) {
    const verified = await verifyJwtEdge(token, secret);
    if (verified) {
      isAuthenticated = true;
    }
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtectedPage = pathname.startsWith('/chat');

  // If user is authenticated and tries to access login/register, redirect to /chat
  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/chat';
    return NextResponse.redirect(url);
  }

  // If user is NOT authenticated and tries to access protected /chat route, redirect to /login
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
    '/chat/:path*',
    '/login',
    '/register',
  ],
};
