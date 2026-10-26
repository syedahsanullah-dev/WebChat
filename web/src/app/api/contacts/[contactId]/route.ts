import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * DELETE /api/contacts/[contactId]: Remove a contact by contactId or target userId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { contactId } = await params;
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Try finding by contact.id or by contact.contactUserId
    const existing = await prisma.contact.findFirst({
      where: {
        userId: currentUser.userId,
        OR: [
          { id: contactId },
          { contactUserId: contactId },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    await prisma.contact.delete({
      where: {
        id: existing.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Contact removed successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing contact:', error);
    return NextResponse.json(
      { error: 'Internal server error removing contact' },
      { status: 500 }
    );
  }
}
