import { prisma } from '../lib/prisma';
import { roomManager } from '../lib/roomManager';
import { logger } from '../lib/logger';
import { WsEnvelope } from '../types';
import { dispatchOfflinePush } from '../handlers/messageHandler';

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * 24/7 background scheduler daemon running every 30 seconds.
 * Queries due reminders from scheduled_reminders, injects bot messages,
 * broadcasts via WebSockets, and notifies via background push if recipient is offline.
 */
export function startReminderScheduler(): void {
  if (schedulerInterval) {
    return;
  }

  logger.info('⏰ Starting background reminder scheduler (30s interval)...');

  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date();
      const dueReminders = await prisma.scheduledReminder.findMany({
        where: {
          remindAt: { lte: now },
          isTriggered: false,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        take: 50,
      });

      if (!dueReminders || dueReminders.length === 0) {
        return;
      }

      logger.info(`⏰ Processing ${dueReminders.length} due reminders...`);

      for (const reminder of dueReminders) {
        try {
          // Mark as triggered first to avoid duplicate dispatch
          await prisma.scheduledReminder.update({
            where: { id: reminder.id },
            data: {
              isTriggered: true,
              triggeredAt: now,
            },
          });

          // Insert system bot message in chat
          const botMessage = await prisma.message.create({
            data: {
              chatId: reminder.chatId,
              senderId: reminder.userId,
              messageType: 'system_bot',
              content: `⏰ **Reminder for @${reminder.user.username}**: ${reminder.reminderText}`,
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

          // Update chat last message
          await prisma.chat.update({
            where: { id: reminder.chatId },
            data: {
              lastMessageId: botMessage.id,
              lastMessageAt: botMessage.createdAt,
            },
          }).catch(() => {});

          // Broadcast over WebSocket to all participants in chat room
          const envelope: WsEnvelope = {
            type: 'message:new',
            payload: {
              id: botMessage.id,
              chatId: reminder.chatId,
              senderId: reminder.userId,
              content: botMessage.content,
              messageType: 'system_bot',
              type: 'system_bot',
              createdAt: botMessage.createdAt.toISOString(),
              status: 'delivered',
              sender: botMessage.sender,
            },
          };

          roomManager.broadcastToRoom(`chat:${reminder.chatId}`, envelope);

          // If reminder target is offline, dispatch background web push
          const isTargetOnline = roomManager.isUserOnline(reminder.userId);
          if (!isTargetOnline) {
            dispatchOfflinePush(
              reminder.userId,
              'Reminder',
              `⏰ ${reminder.reminderText}`,
              reminder.chatId
            );
          }

          logger.info(`⏰ Dispatched reminder [${reminder.id}] to chat ${reminder.chatId}`);
        } catch (itemErr: any) {
          logger.error(`Failed to dispatch reminder ${reminder.id}:`, itemErr);
        }
      }
    } catch (err: any) {
      logger.error('Error in reminder scheduler cycle:', err);
    }
  }, 30000);
}

export function stopReminderScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('⏰ Stopped background reminder scheduler');
  }
}
