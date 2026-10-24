"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = exports.RoomManager = void 0;
const ws_1 = require("ws");
class RoomManager {
    // Map of roomId -> Set of connected WebSockets
    rooms = new Map();
    // Map of userId -> Set of active WebSockets for that user (multiple tabs)
    userSockets = new Map();
    join(room, socket) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(socket);
        socket.rooms.add(room);
    }
    leave(room, socket) {
        if (this.rooms.has(room)) {
            this.rooms.get(room).delete(socket);
            if (this.rooms.get(room).size === 0) {
                this.rooms.delete(room);
            }
        }
        socket.rooms.delete(room);
    }
    leaveAll(socket) {
        for (const room of Array.from(socket.rooms)) {
            this.leave(room, socket);
        }
        if (this.userSockets.has(socket.userId)) {
            this.userSockets.get(socket.userId).delete(socket);
            if (this.userSockets.get(socket.userId).size === 0) {
                this.userSockets.delete(socket.userId);
            }
        }
    }
    registerUser(userId, socket) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket);
    }
    isUserOnline(userId) {
        return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
    }
    broadcastToRoom(room, data, excludeSocket) {
        const sockets = this.rooms.get(room);
        if (!sockets)
            return;
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        for (const socket of sockets) {
            if (socket !== excludeSocket && socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(message);
            }
        }
    }
    sendToUser(userId, data) {
        const sockets = this.userSockets.get(userId);
        if (!sockets)
            return;
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        for (const socket of sockets) {
            if (socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(message);
            }
        }
    }
    // Accessors for metrics/testing
    getActiveRoomCount() {
        return this.rooms.size;
    }
    getOnlineUserCount() {
        return this.userSockets.size;
    }
    getRoomMemberCount(room) {
        return this.rooms.get(room)?.size ?? 0;
    }
    getUserSocketCount(userId) {
        return this.userSockets.get(userId)?.size ?? 0;
    }
}
exports.RoomManager = RoomManager;
exports.roomManager = new RoomManager();
exports.default = exports.roomManager;
