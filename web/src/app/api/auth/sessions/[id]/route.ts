import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { revokeSession } from '@/lib/sessionManager';

/**
 * DELETE /api/auth/sessions/[id]
 * Revokes a specific remote device session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { id: sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const revoked = await revokeSession(authUser.userId, sessionId);
    if (!revoked) {
      return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Session revoked successfully', sessionId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revoking specific session:', error);
    return NextResponse.json({ error: 'Internal server error revoking session' }, { status: 500 });
  }
}
