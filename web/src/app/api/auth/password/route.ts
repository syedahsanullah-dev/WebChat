import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { ChangePasswordSchema } from '@/lib/validations';
import { revokeAllOtherSessions } from '@/lib/sessionManager';

/**
 * POST /api/auth/password
 * Changes the user's password and automatically invalidates all other active sessions
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = ChangePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message || 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    // Hash new password with 12 salt rounds
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update user password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all other active sessions except current
    let revokedCount = 0;
    if (authUser.sessionToken) {
      revokedCount = await revokeAllOtherSessions(user.id, authUser.sessionToken);
    }

    return NextResponse.json(
      {
        message: 'Password updated successfully. All other active sessions have been invalidated.',
        revokedOtherSessions: revokedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error changing password' }, { status: 500 });
  }
}
