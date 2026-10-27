import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { PollVotePayload } from '../types/index.js';
/**
 * Handles incoming poll:vote event:
 * 1. Validates socket session and option presence
 * 2. Toggles or casts vote in MySQL
 * 3. Re-calculates tallies and percentages
 * 4. Broadcasts poll:update envelope to all chat participants
 */
export declare function handlePollVote(socket: AuthenticatedWebSocket, payload: PollVotePayload): Promise<void>;
