import { AuthenticatedWebSocket } from '../lib/roomManager.js';
import { GroupMemberUpdatePayload } from '../types/index.js';
/**
 * Handles group:join event: subscribes socket to chat:${groupId}
 */
export declare function handleGroupJoin(socket: AuthenticatedWebSocket, payload: {
    groupId?: string;
    chatId?: string;
}): void;
/**
 * Handles group:leave event: removes socket from chat:${groupId}
 */
export declare function handleGroupLeave(socket: AuthenticatedWebSocket, payload: {
    groupId?: string;
    chatId?: string;
}): void;
/**
 * Handles group:member_update event: broadcasts membership changes to all members
 */
export declare function handleGroupMemberUpdate(socket: AuthenticatedWebSocket, payload: GroupMemberUpdatePayload): void;
