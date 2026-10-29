import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * GET /api/chats/:id/pin
 * Fetch active pinned messages for the chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    const pinnedMessages = await prisma.pinnedMessage.findMany({
      where: {
        chatId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { pinnedAt: 'desc' },
      take: 3,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            messageType: true,
            sender: {
              select: { displayName: true, username: true },
            },
          },
        },
        pinnedBy: {
          select: { displayName: true, username: true },
        },
      },
    });

    const formattedPins = pinnedMessages.map((pin) => ({
      id: pin.id,
      chatId: pin.chatId,
      messageId: pin.messageId,
      pinnedById: pin.pinnedById,
      pinnedByName: pin.pinnedBy.displayName || pin.pinnedBy.username,
      expiresAt: pin.expiresAt ? pin.expiresAt.toISOString() : null,
      pinnedAt: pin.pinnedAt.toISOString(),
      messageSnippet: pin.message.content ? pin.message.content.slice(0, 100) : '',
      messageSenderName: pin.message.sender.displayName || pin.message.sender.username,
    }));

    return NextResponse.json({ pins: formattedPins });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    return NextResponse.json({ error: 'Failed to fetch pinned messages' }, { status: 500 });
  }
}

/**
 * POST /api/chats/:id/pin
 * Pin a message to the chat header (duration: 1d, 7d, 30d; max 3 pins)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { messageId, durationDays = 7 } = body;

    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
    }

    // Verify message exists and belongs to chat
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { displayName: true, username: true },
        },
      },
    });

    if (!message || message.chatId !== chatId) {
      return NextResponse.json({ error: 'Message not found in this chat' }, { status: 404 });
    }

    // Calculate expiration
    const days = [1, 7, 30].includes(Number(durationDays)) ? Number(durationDays) : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Upsert pinned message
    const pinnedRecord = await prisma.pinnedMessage.upsert({
      where: {
        chatId_messageId: {
          chatId,
          messageId,
        },
      },
      create: {
        chatId,
        messageId,
        pinnedById: authUser.userId,
        expiresAt,
      },
      update: {
        pinnedById: authUser.userId,
        expiresAt,
        pinnedAt: new Date(),
      },
    });

    // Enforce max 3 pinned messages per chat: delete oldest if > 3
    const allPins = await prisma.pinnedMessage.findMany({
      where: { chatId },
      orderBy: { pinnedAt: 'desc' },
    });

    if (allPins.length > 3) {
      const pinsToDelete = allPins.slice(3);
      await prisma.pinnedMessage.deleteMany({
        where: {
          id: { in: pinsToDelete.map((p) => p.id) },
        },
      });
    }

    // Return active pins list
    const activePins = await prisma.pinnedMessage.findMany({
      where: { chatId },
      orderBy: { pinnedAt: 'desc' },
      take: 3,
      include: {
        message: {
          select: {
            content: true,
            sender: {
              select: { displayName: true, username: true },
            },
          },
        },
        pinnedBy: {
          select: { displayName: true, username: true },
        },
      },
    });

    const formattedActivePins = activePins.map((pin) => ({
      id: pin.id,
      chatId: pin.chatId,
      messageId: pin.messageId,
      pinnedById: pin.pinnedById,
      pinnedByName: pin.pinnedBy.displayName || pin.pinnedBy.username,
      expiresAt: pin.expiresAt ? pin.expiresAt.toISOString() : null,
      pinnedAt: pin.pinnedAt.toISOString(),
      messageSnippet: pin.message.content ? pin.message.content.slice(0, 100) : '',
      messageSenderName: pin.message.sender.displayName || pin.message.sender.username,
    }));

    return NextResponse.json({
      success: true,
      pinnedMessage: {
        id: pinnedRecord.id,
        chatId,
        messageId,
        pinnedById: authUser.userId,
        expiresAt: pinnedRecord.expiresAt ? pinnedRecord.expiresAt.toISOString() : null,
        pinnedAt: pinnedRecord.pinnedAt.toISOString(),
        messageSnippet: message.content ? message.content.slice(0, 100) : '',
        messageSenderName: message.sender.displayName || message.sender.username,
      },
      activePins: formattedActivePins,
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
  }
}

/**
 * DELETE /api/chats/:id/pin
 * Unpin a message from the chat
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId query parameter is required' }, { status: 400 });
    }

    await prisma.pinnedMessage.deleteMany({
      where: {
        chatId,
        messageId,
      },
    });

    // Return remaining pins
    const activePins = await prisma.pinnedMessage.findMany({
      where: { chatId },
      orderBy: { pinnedAt: 'desc' },
      take: 3,
      include: {
        message: {
          select: {
            content: true,
            sender: {
              select: { displayName: true, username: true },
            },
          },
        },
        pinnedBy: {
          select: { displayName: true, username: true },
        },
      },
    });

    const formattedActivePins = activePins.map((pin) => ({
      id: pin.id,
      chatId: pin.chatId,
      messageId: pin.messageId,
      pinnedById: pin.pinnedById,
      pinnedByName: pin.pinnedBy.displayName || pin.pinnedBy.username,
      expiresAt: pin.expiresAt ? pin.expiresAt.toISOString() : null,
      pinnedAt: pin.pinnedAt.toISOString(),
      messageSnippet: pin.message.content ? pin.message.content.slice(0, 100) : '',
      messageSenderName: pin.message.sender.displayName || pin.message.sender.username,
    }));

    return NextResponse.json({
      success: true,
      activePins: formattedActivePins,
    });
  } catch (error) {
    console.error('Error unpinning message:', error);
    return NextResponse.json({ error: 'Failed to unpin message' }, { status: 500 });
  }
}
