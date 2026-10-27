import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { MessageSendPayload, MessageReadPayload } from '../types/index.js';
/**
 * Handles incoming message:send event:
 * 1. Persists message to MySQL
 * 2. Creates initial MessageStatus (sent or delivered depending on recipient presence)
 * 3. Updates Chat.lastMessageAt & Chat.lastMessageId
 * 4. Acks to sender with message:ack and confirmed ID/status
 * 5. Dispatches message:new to recipient and message:status (delivered) to sender
 */
export declare function handleMessageSend(socket: AuthenticatedWebSocket, payload: MessageSendPayload): Promise<void>;
/**
 * Handles incoming message:read event:
 * Marks unread messages in the chat as read in DB and broadcasts status: 'read'
 */
export declare function handleMessageRead(socket: AuthenticatedWebSocket, payload: MessageReadPayload): Promise<void>;
/**
 * Dispatches a background Web Push notification to an offline recipient via Server #1 Next.js API
 */
export declare function dispatchOfflinePush(recipientId: string, payload: any): Promise<void>;
