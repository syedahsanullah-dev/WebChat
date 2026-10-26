import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No session token found' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session token' }, { status: 401 });
    }

    return NextResponse.json({ token, user: payload }, { status: 200 });
  } catch (error) {
    console.error('Error fetching auth token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
