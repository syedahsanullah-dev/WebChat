import { WebSocket } from 'ws';
export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    username: string;
    systemRole?: string;
    isAlive: boolean;
    rooms: Set<string>;
}
export declare class RoomManager {
    private rooms;
    private userSockets;
    join(room: string, socket: AuthenticatedWebSocket): void;
    leave(room: string, socket: AuthenticatedWebSocket): void;
    leaveAll(socket: AuthenticatedWebSocket): void;
    registerUser(userId: string, socket: AuthenticatedWebSocket): void;
    isUserOnline(userId: string): boolean;
    broadcastToRoom(room: string, data: any, excludeSocket?: AuthenticatedWebSocket): void;
    sendToUser(userId: string, data: any): void;
    kickUser(userId: string, reason?: string): void;
    broadcastAll(data: any, excludeSocket?: AuthenticatedWebSocket): void;
    getActiveRoomCount(): number;
    getOnlineUserCount(): number;
    getOnlineUserIds(): string[];
    getActiveSocketCount(): number;
    getRoomMemberCount(room: string): number;
    getUserSocketCount(userId: string): number;
    getUserSockets(userId: string): Set<AuthenticatedWebSocket> | undefined;
    getRoomMembers(room: string): Set<AuthenticatedWebSocket> | undefined;
    clear(): void;
}
export declare const roomManager: RoomManager;
export default roomManager;
