/**
 * 24/7 background scheduler daemon running every 30 seconds.
 * Queries due reminders from scheduled_reminders, injects bot messages,
 * broadcasts via WebSockets, and notifies via background push if recipient is offline.
 */
export declare function startReminderScheduler(): void;
export declare function stopReminderScheduler(): void;
