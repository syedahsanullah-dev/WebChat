import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const { chatId } = await params;
    const currentUserId = authUser.userId;

    // Update MessageStatus records for incoming unread messages in this chat
    await prisma.messageStatus.updateMany({
      where: {
        message: { chatId },
        userId: currentUserId,
        status: { not: 'read' },
      },
      data: {
        status: 'read',
      },
    });

    // Update participant lastReadAt
    await prisma.chatParticipant.updateMany({
      where: {
        chatId,
        userId: currentUserId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/chats/[chatId]/read:', error);
    return NextResponse.json({ error: 'Internal server error marking messages as read' }, { status: 500 });
  }
}
