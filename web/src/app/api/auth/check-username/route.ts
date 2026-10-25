import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CheckUsernameSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    const validation = CheckUsernameSchema.safeParse({ q });
    if (!validation.success) {
      return NextResponse.json(
        {
          available: false,
          error: validation.error.errors[0]?.message || 'Invalid username format',
        },
        { status: 400 }
      );
    }

    const username = validation.data.q;

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          available: false,
          username,
          message: 'Username is already taken',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        available: true,
        username,
        message: 'Username is available',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in check-username endpoint:', error);
    return NextResponse.json(
      { available: false, error: 'Internal server error checking username' },
      { status: 500 }
    );
  }
}
