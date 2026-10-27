import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { ChatPinPayload } from '../types/index.js';
/**
 * Handles incoming chat:pin event:
 * 1. Validates chat and message existence
 * 2. Enforces maximum 3 pinned messages per chat (unpins oldest if exceeded)
 * 3. Persists PinnedMessage with optional expiresAt duration
 * 4. Broadcasts chat:pin_updated to all participants in room
 */
export declare function handleChatPin(socket: AuthenticatedWebSocket, payload: ChatPinPayload): Promise<void>;
