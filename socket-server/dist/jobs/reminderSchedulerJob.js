"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderScheduler = startReminderScheduler;
exports.stopReminderScheduler = stopReminderScheduler;
const prisma_1 = require("../lib/prisma");
const roomManager_1 = require("../lib/roomManager");
const logger_1 = require("../lib/logger");
const messageHandler_1 = require("../handlers/messageHandler");
let schedulerInterval = null;
/**
 * 24/7 background scheduler daemon running every 30 seconds.
 * Queries due reminders from scheduled_reminders, injects bot messages,
 * broadcasts via WebSockets, and notifies via background push if recipient is offline.
 */
function startReminderScheduler() {
    if (schedulerInterval) {
        return;
    }
    logger_1.logger.info('⏰ Starting background reminder scheduler (30s interval)...');
    schedulerInterval = setInterval(async () => {
        try {
            const now = new Date();
            const dueReminders = await prisma_1.prisma.scheduledReminder.findMany({
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
            logger_1.logger.info(`⏰ Processing ${dueReminders.length} due reminders...`);
            for (const reminder of dueReminders) {
                try {
                    // Mark as triggered first to avoid duplicate dispatch
                    await prisma_1.prisma.scheduledReminder.update({
                        where: { id: reminder.id },
                        data: {
                            isTriggered: true,
                            triggeredAt: now,
                        },
                    });
                    // Insert system bot message in chat
                    const botMessage = await prisma_1.prisma.message.create({
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
                    await prisma_1.prisma.chat.update({
                        where: { id: reminder.chatId },
                        data: {
                            lastMessageId: botMessage.id,
                            lastMessageAt: botMessage.createdAt,
                        },
                    }).catch(() => { });
                    // Broadcast over WebSocket to all participants in chat room
                    const envelope = {
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
                    roomManager_1.roomManager.broadcastToRoom(`chat:${reminder.chatId}`, envelope);
                    // If reminder target is offline, dispatch background web push
                    const isTargetOnline = roomManager_1.roomManager.isUserOnline(reminder.userId);
                    if (!isTargetOnline) {
                        (0, messageHandler_1.dispatchOfflinePush)(reminder.userId, {
                            title: 'Reminder',
                            body: `⏰ ${reminder.reminderText}`,
                            chatId: reminder.chatId,
                        }).catch(() => { });
                    }
                    logger_1.logger.info(`⏰ Dispatched reminder [${reminder.id}] to chat ${reminder.chatId}`);
                }
                catch (itemErr) {
                    logger_1.logger.error(`Failed to dispatch reminder ${reminder.id}:`, itemErr);
                }
            }
        }
        catch (err) {
            logger_1.logger.error('Error in reminder scheduler cycle:', err);
        }
    }, 30000);
}
function stopReminderScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        logger_1.logger.info('⏰ Stopped background reminder scheduler');
    }
}
