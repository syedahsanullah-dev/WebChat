import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager, AuthenticatedWebSocket } from '../src/lib/roomManager.js';
import { WebSocket } from 'ws';

function createMockSocket(userId: string, username: string): AuthenticatedWebSocket {
  return {
    userId,
    username,
    isAlive: true,
    rooms: new Set<string>(),
    readyState: WebSocket.OPEN,
    send: vi.fn(),
  } as unknown as AuthenticatedWebSocket;
}

describe('Phase 13: RoomManager Unit Tests', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('User Connection Tracking & Multi-Tab Presence', () => {
    it('accurately tracks online status when user connects across multiple tabs', () => {
      expect(roomManager.isUserOnline('user-1')).toBe(false);

      const tab1 = createMockSocket('user-1', 'alice');
      const tab2 = createMockSocket('user-1', 'alice');

      roomManager.registerUser('user-1', tab1);
      expect(roomManager.isUserOnline('user-1')).toBe(true);
      expect(roomManager.getOnlineUserCount()).toBe(1);

      // Register second tab
      roomManager.registerUser('user-1', tab2);
      expect(roomManager.isUserOnline('user-1')).toBe(true);

      // Disconnect one tab
      roomManager.leaveAll(tab1);
      expect(roomManager.isUserOnline('user-1')).toBe(true); // Tab 2 still active

      // Disconnect last tab
      roomManager.leaveAll(tab2);
      expect(roomManager.isUserOnline('user-1')).toBe(false);
      expect(roomManager.getOnlineUserCount()).toBe(0);
    });

    it('returns undefined for offline users and set of sockets for online users', () => {
      const socket = createMockSocket('user-2', 'bob');
      roomManager.registerUser('user-2', socket);

      const sockets = roomManager.getUserSockets('user-2');
      expect(sockets).toBeDefined();
      expect(sockets?.has(socket)).toBe(true);
      expect(sockets?.size).toBe(1);
      expect(roomManager.getUserSockets('user-999')).toBeUndefined();
    });
  });

  describe('Room Join, Leave & Purge', () => {
    it('adds socket to room and updates socket.rooms set', () => {
      const socket = createMockSocket('user-1', 'alice');
      roomManager.join('chat-100', socket);

      expect(roomManager.getActiveRoomCount()).toBe(1);
      expect(roomManager.getRoomMemberCount('chat-100')).toBe(1);
      expect(socket.rooms.has('chat-100')).toBe(true);
    });

    it('removes socket from room and automatically deletes empty rooms', () => {
      const socket = createMockSocket('user-1', 'alice');
      roomManager.join('chat-100', socket);

      roomManager.leave('chat-100', socket);
      expect(roomManager.getActiveRoomCount()).toBe(0);
      expect(roomManager.getRoomMemberCount('chat-100')).toBe(0);
      expect(socket.rooms.has('chat-100')).toBe(false);
    });

    it('leaveAll removes socket from all rooms and userSockets map', () => {
      const socket = createMockSocket('user-1', 'alice');
      roomManager.registerUser('user-1', socket);
      roomManager.join('room-a', socket);
      roomManager.join('room-b', socket);
      roomManager.join('room-c', socket);

      expect(roomManager.getActiveRoomCount()).toBe(3);
      expect(roomManager.isUserOnline('user-1')).toBe(true);

      roomManager.leaveAll(socket);

      expect(roomManager.getActiveRoomCount()).toBe(0);
      expect(roomManager.isUserOnline('user-1')).toBe(false);
      expect(socket.rooms.size).toBe(0);
    });
  });

  describe('Broadcasting & Messaging', () => {
    it('broadcastToRoom sends payload to all sockets in the room except excluded socket', () => {
      const alice = createMockSocket('user-1', 'alice');
      const bob = createMockSocket('user-2', 'bob');
      const charlie = createMockSocket('user-3', 'charlie');

      roomManager.join('group-1', alice);
      roomManager.join('group-1', bob);
      roomManager.join('group-2', charlie);

      const payload = { type: 'message:new', payload: { text: 'Hello Group!' } };
      roomManager.broadcastToRoom('group-1', payload, alice);

      // Alice is sender, so excluded
      expect(alice.send).not.toHaveBeenCalled();
      // Bob is in group-1, so received message
      expect(bob.send).toHaveBeenCalledWith(JSON.stringify(payload));
      // Charlie is in group-2, so excluded
      expect(charlie.send).not.toHaveBeenCalled();
    });

    it('sendToUser routes message to all active sockets of a target user', () => {
      const aliceTab1 = createMockSocket('alice-id', 'alice');
      const aliceTab2 = createMockSocket('alice-id', 'alice');
      const bob = createMockSocket('bob-id', 'bob');

      roomManager.registerUser('alice-id', aliceTab1);
      roomManager.registerUser('alice-id', aliceTab2);
      roomManager.registerUser('bob-id', bob);

      const payload = { type: 'audio-call:invite', payload: { callerId: 'bob-id' } };
      roomManager.sendToUser('alice-id', payload);

      expect(aliceTab1.send).toHaveBeenCalledWith(JSON.stringify(payload));
      expect(aliceTab2.send).toHaveBeenCalledWith(JSON.stringify(payload));
      expect(bob.send).not.toHaveBeenCalled();
    });
  });
});
