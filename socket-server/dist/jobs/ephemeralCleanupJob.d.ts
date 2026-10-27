/**
 * 24/7 background ephemeral cleanup daemon running every 15 minutes.
 * Permanently purges expired messages and deletes local disk media files,
 * respecting active Legal Hold status.
 */
export declare function startEphemeralCleanupJob(intervalMs?: number): void;
export declare function stopEphemeralCleanupJob(): void;
