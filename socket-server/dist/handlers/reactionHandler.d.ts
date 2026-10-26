import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { MessageReactionPayload } from '../types/index.js';
/**
 * Handles incoming message:reaction event:
 * Toggles or updates emoji reaction and broadcasts to the chat room
 */
export declare function handleMessageReaction(socket: AuthenticatedWebSocket, payload: MessageReactionPayload): void;
