import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { AddContactSchema } from '@/lib/validations';

/**
 * GET /api/contacts: Retrieve all contacts for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: currentUser.userId,
      },
      include: {
        contactUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            about: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
      orderBy: [
        {
          contactUser: {
            displayName: 'asc',
          },
        },
      ],
    });

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error fetching contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts: Add or update a contact with optional nickname
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
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

    const validation = AddContactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message || 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { contactUserId, aliasName } = validation.data;

    // Prevent adding self
    if (contactUserId === currentUser.userId) {
      return NextResponse.json(
        { error: 'You cannot add yourself as a contact' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: contactUserId },
      select: { id: true, username: true, displayName: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user does not exist' },
        { status: 404 }
      );
    }

    // Upsert contact record
    const contact = await prisma.contact.upsert({
      where: {
        userId_contactUserId: {
          userId: currentUser.userId,
          contactUserId,
        },
      },
      update: {
        aliasName: aliasName?.trim() || null,
      },
      create: {
        userId: currentUser.userId,
        contactUserId,
        aliasName: aliasName?.trim() || null,
      },
      include: {
        contactUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            about: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Contact saved successfully',
        contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding/updating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error saving contact' },
      { status: 500 }
    );
  }
}
