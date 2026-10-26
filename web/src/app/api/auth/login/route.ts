import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { LoginSchema } from '@/lib/validations';
import { signToken, setAuthCookie } from '@/lib/auth';
import { createSession } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message || 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { identifier, password } = validation.data;
    const cleanIdentifier = identifier.toLowerCase().trim();

    // Query user by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Create new active device session record in MySQL
    let sessionToken: string | undefined;
    let sessionId: string | undefined;
    try {
      const sessionResult = await createSession(user.id, request);
      sessionToken = sessionResult.sessionToken;
      sessionId = sessionResult.session.id;
    } catch (sessionErr) {
      console.warn('Session tracking non-fatal error:', sessionErr);
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      sessionToken,
      sessionId,
    });

    // Sanitized user object
    const sanitizedUser = {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      about: user.about,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: sanitizedUser,
      },
      { status: 200 }
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
