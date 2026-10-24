import { WebSocket } from 'ws';
export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    username: string;
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
    getActiveRoomCount(): number;
    getOnlineUserCount(): number;
    getRoomMemberCount(room: string): number;
    getUserSocketCount(userId: string): number;
}
export declare const roomManager: RoomManager;
export default roomManager;
