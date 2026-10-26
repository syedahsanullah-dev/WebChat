import { AuthenticatedWebSocket } from '../lib/roomManager.js';
export interface TypingEventPayload {
    chatId: string;
    recipientId?: string;
}
/**
 * Handles typing:start event, broadcasting to chat room and recipient
 */
export declare function handleTypingStart(socket: AuthenticatedWebSocket, payload: TypingEventPayload): void;
/**
 * Handles typing:stop event, broadcasting to chat room and recipient
 */
export declare function handleTypingStop(socket: AuthenticatedWebSocket, payload: TypingEventPayload): void;
