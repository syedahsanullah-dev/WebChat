import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { ProfileUpdateSchema } from '@/lib/validations';

export async function PATCH(request: NextRequest) {
  try {
    const payload = getAuthUserFromRequest(request);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const validation = ProfileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message || 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { displayName, about } = validation.data;

    // Build update object only for provided fields
    const updateData: { displayName?: string; about?: string } = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (about !== undefined) updateData.about = about;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        avatarUrl: true,
        about: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error updating user profile' },
      { status: 500 }
    );
  }
}
