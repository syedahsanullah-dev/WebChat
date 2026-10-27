/**
 * Real-time socket kick engine.
 * Sends user:kick envelope and force disconnects all active WebSockets
 * for the target user in < 50ms with close code 4002 (Account Suspended).
 */
export declare function kickUserSockets(userId: string, reason: string, suspendedUntil?: string | null): number;
