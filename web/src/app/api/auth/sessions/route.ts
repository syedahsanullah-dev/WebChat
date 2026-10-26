import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getUserSessions, revokeAllOtherSessions } from '@/lib/sessionManager';

/**
 * GET /api/auth/sessions
 * Returns all active device sessions for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const sessions = await getUserSessions(authUser.userId, authUser.sessionToken);
    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return NextResponse.json({ error: 'Internal server error fetching sessions' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/sessions
 * Revokes all remote sessions except the current active session
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    if (!authUser.sessionToken) {
      return NextResponse.json(
        { error: 'Cannot revoke other sessions: Current session token missing' },
        { status: 400 }
      );
    }

    const revokedCount = await revokeAllOtherSessions(authUser.userId, authUser.sessionToken);

    return NextResponse.json(
      {
        message: 'All other sessions revoked successfully',
        revokedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revoking other sessions:', error);
    return NextResponse.json({ error: 'Internal server error revoking sessions' }, { status: 500 });
  }
}
