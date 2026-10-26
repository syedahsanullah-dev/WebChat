import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { MessageDeletePayload } from '../types/index.js';
/**
 * Handles incoming message:delete event:
 * - "Delete for everyone": Updates MySQL isDeleted = true and broadcasts to room
 * - "Delete for me": Acknowledges to the sender socket only
 */
export declare function handleMessageDelete(socket: AuthenticatedWebSocket, payload: MessageDeletePayload): Promise<void>;
