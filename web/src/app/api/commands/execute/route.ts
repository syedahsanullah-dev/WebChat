import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { parseSlashCommand, AVAILABLE_COMMANDS } from '@/lib/slashCommandParser';
import { formatFriendlyTime } from '@/lib/timeParser';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SOCKET_SERVER_URL =
  process.env.INTERNAL_SOCKET_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/^ws/, 'http') ||
  'https://ws.vusigma.com';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const chatId = String(body.chatId || '').trim();
    const rawText = String(body.text || '').trim();

    if (!chatId || !rawText) {
      return NextResponse.json(
        { error: 'chatId and text are required' },
        { status: 400 }
      );
    }

    // Verify user is in the chat
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatId, userId: user.id },
      include: { chat: true },
    });

    if (!participant && user.systemRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = parseSlashCommand(rawText);
    if (!parsed) {
      return NextResponse.json({ error: 'Not a valid slash command' }, { status: 400 });
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // 1. /help
    if (parsed.command === '/help') {
      return NextResponse.json({
        success: true,
        type: 'help',
        feedback: 'Available slash commands displayed',
        commands: AVAILABLE_COMMANDS,
      });
    }

    // 2. /remind
    if (parsed.command === '/remind' && parsed.data?.remindAt && parsed.data?.reminderText) {
      const reminder = await prisma.scheduledReminder.create({
        data: {
          chatId,
          userId: user.id,
          reminderText: parsed.data.reminderText,
          remindAt: parsed.data.remindAt,
        },
      });

      const friendlyTime = formatFriendlyTime(parsed.data.remindAt);

      return NextResponse.json({
        success: true,
        type: 'remind',
        reminderId: reminder.id,
        feedback: `⏰ Reminder scheduled for ${friendlyTime}`,
        remindAt: reminder.remindAt.toISOString(),
      });
    }

    // 3. /poll
    if (parsed.command === '/poll' && parsed.data?.question && parsed.data?.options) {
      const { question, options } = parsed.data;

      const poll = await prisma.poll.create({
        data: {
          chatId,
          creatorId: user.id,
          question,
          options: {
            create: options.map((opt, idx) => ({
              text: opt,
              orderIdx: idx,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      // Construct formatted poll announcement in chat
      const optionsText = options.map((opt, i) => `🔹 ${i + 1}. ${opt}`).join('\n');
      const pollContent = `📊 **Poll: ${question}**\n\n${optionsText}\n\n_(Created by @${user.username})_`;

      const botMessage = await prisma.message.create({
        data: {
          chatId,
          senderId: user.id,
          messageType: 'system_bot',
          content: pollContent,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageId: botMessage.id,
          lastMessageAt: botMessage.createdAt,
        },
      }).catch(() => {});

      // Broadcast over WebSocket to chat room
      try {
        await fetch(`${SOCKET_SERVER_URL}/internal/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            message: {
              id: botMessage.id,
              chatId: botMessage.chatId,
              senderId: botMessage.senderId,
              content: botMessage.content,
              messageType: 'system_bot',
              type: 'system_bot',
              createdAt: botMessage.createdAt.toISOString(),
              status: 'delivered',
              authorName: 'Poll Bot',
              sender: botMessage.sender,
              pollId: poll.id,
            },
          }),
        });
      } catch (wsErr: any) {
        logger.warn(`Could not notify socket server for poll: ${wsErr?.message || wsErr}`);
      }

      return NextResponse.json({
        success: true,
        type: 'poll',
        pollId: poll.id,
        feedback: `Poll "${question}" created with ${options.length} options!`,
      });
    }

    // 4. /announce
    if (parsed.command === '/announce' && parsed.data?.announcementText) {
      const isChatAdmin = participant?.role === 'admin' || user.systemRole === 'SUPER_ADMIN' || user.systemRole === 'ADMIN';

      if (!isChatAdmin) {
        return NextResponse.json(
          { error: 'Only chat admins can post announcements using /announce' },
          { status: 403 }
        );
      }

      const announcementContent = `📢 **Announcement from @${user.username}**:\n${parsed.data.announcementText}`;

      const botMessage = await prisma.message.create({
        data: {
          chatId,
          senderId: user.id,
          messageType: 'system_bot',
          content: announcementContent,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageId: botMessage.id,
          lastMessageAt: botMessage.createdAt,
        },
      }).catch(() => {});

      // Broadcast over WebSocket to chat room
      try {
        await fetch(`${SOCKET_SERVER_URL}/internal/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            message: {
              id: botMessage.id,
              chatId: botMessage.chatId,
              senderId: botMessage.senderId,
              content: botMessage.content,
              messageType: 'system_bot',
              type: 'system_bot',
              createdAt: botMessage.createdAt.toISOString(),
              status: 'delivered',
              authorName: 'Announcement',
              sender: botMessage.sender,
            },
          }),
        });
      } catch (wsErr: any) {
        logger.warn(`Could not notify socket server for announcement: ${wsErr?.message || wsErr}`);
      }

      return NextResponse.json({
        success: true,
        type: 'announce',
        feedback: 'Announcement broadcasted to chat',
      });
    }

    return NextResponse.json({ error: 'Command not recognized' }, { status: 400 });
  } catch (error: any) {
    logger.error('Error executing slash command:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error executing command' },
      { status: 500 }
    );
  }
}
