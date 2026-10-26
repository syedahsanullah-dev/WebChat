import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { RegisterSchema } from '@/lib/validations';
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

    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message || 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { displayName, username, email, password } = validation.data;

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already registered' },
        { status: 409 }
      );
    }

    // Check if email is already taken
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Hash password with 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in database
    const newUser = await prisma.user.create({
      data: {
        displayName,
        username,
        email,
        passwordHash,
        about: 'Hey there! I am using WebChat.',
        isOnline: false,
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        createdAt: true,
      },
    });

    // Create initial active session in MySQL
    let sessionToken: string | undefined;
    let sessionId: string | undefined;
    try {
      const sessionResult = await createSession(newUser.id, request);
      sessionToken = sessionResult.sessionToken;
      sessionId = sessionResult.session.id;
    } catch (sessionErr) {
      console.warn('Session tracking non-fatal error:', sessionErr);
    }

    // Generate JWT token
    const token = signToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      sessionToken,
      sessionId,
    });

    // Prepare response with HTTP-only cookie
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: newUser,
      },
      { status: 201 }
    );

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
