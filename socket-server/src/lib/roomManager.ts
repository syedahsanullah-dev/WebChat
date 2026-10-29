import { WebSocket } from 'ws';

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  username: string;
  systemRole?: string;
  isAlive: boolean;
  rooms: Set<string>;
}

export class RoomManager {
  // Map of roomId -> Set of connected WebSockets
  private rooms: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  // Map of userId -> Set of active WebSockets for that user (multiple tabs)
  private userSockets: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  join(room: string, socket: AuthenticatedWebSocket): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(socket);
    socket.rooms.add(room);
  }

  leave(room: string, socket: AuthenticatedWebSocket): void {
    if (this.rooms.has(room)) {
      this.rooms.get(room)!.delete(socket);
      if (this.rooms.get(room)!.size === 0) {
        this.rooms.delete(room);
      }
    }
    socket.rooms.delete(room);
  }

  leaveAll(socket: AuthenticatedWebSocket): void {
    for (const room of Array.from(socket.rooms)) {
      this.leave(room, socket);
    }
    if (this.userSockets.has(socket.userId)) {
      this.userSockets.get(socket.userId)!.delete(socket);
      if (this.userSockets.get(socket.userId)!.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }
  }

  registerUser(userId: string, socket: AuthenticatedWebSocket): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  broadcastToRoom(room: string, data: any, excludeSocket?: AuthenticatedWebSocket): void {
    const sockets = this.rooms.get(room);
    if (!sockets) return;
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    for (const socket of sockets) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  sendToUser(userId: string, data: any, excludeSocket?: AuthenticatedWebSocket): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    for (const socket of sockets) {
      if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
  }

  kickUser(userId: string, reason: string = 'Account suspended'): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const kickEnvelope = JSON.stringify({
      type: 'user:kick',
      payload: { userId, reason },
    });
    for (const socket of Array.from(sockets)) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(kickEnvelope);
          socket.close(4002, 'Account Suspended');
        } catch {
          socket.terminate();
        }
      }
      this.leaveAll(socket);
    }
    this.userSockets.delete(userId);
  }

  broadcastAll(data: any, excludeSocket?: AuthenticatedWebSocket): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    for (const sockets of this.userSockets.values()) {
      for (const socket of sockets) {
        if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      }
    }
  }

  // Accessors for metrics/testing
  getActiveRoomCount(): number {
    return this.rooms.size;
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getActiveSocketCount(): number {
    let count = 0;
    for (const sockets of this.userSockets.values()) {
      count += sockets.size;
    }
    return count;
  }

  getRoomMemberCount(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  getUserSockets(userId: string): Set<AuthenticatedWebSocket> | undefined {
    return this.userSockets.get(userId);
  }

  getRoomMembers(room: string): Set<AuthenticatedWebSocket> | undefined {
    return this.rooms.get(room);
  }

  clear(): void {
    this.rooms.clear();
    this.userSockets.clear();
  }
}

export const roomManager = new RoomManager();
export default roomManager;
