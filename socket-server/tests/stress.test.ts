import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomManager, AuthenticatedWebSocket } from '../src/lib/roomManager.js';
import { WebSocket } from 'ws';

function createMockSocket(userId: string, username = 'testuser'): AuthenticatedWebSocket {
  return {
    userId,
    username,
    isAlive: true,
    rooms: new Set<string>(),
    readyState: WebSocket.OPEN,
    send: vi.fn(),
  } as unknown as AuthenticatedWebSocket;
}

describe('Empirical Challenger: RoomManager Stress & Concurrency Suite', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('Multi-Tab Concurrency Lifecycle', () => {
    it('handles 3 tabs for a single user with progressive closure', () => {
      const tab1 = createMockSocket('user-alice', 'Alice');
      const tab2 = createMockSocket('user-alice', 'Alice');
      const tab3 = createMockSocket('user-alice', 'Alice');

      // 1. Initial state
      expect(manager.isUserOnline('user-alice')).toBe(false);
      expect(manager.getOnlineUserCount()).toBe(0);

      // 2. Open Tab 1
      manager.registerUser('user-alice', tab1);
      expect(manager.isUserOnline('user-alice')).toBe(true);
      expect(manager.getUserSocketCount('user-alice')).toBe(1);
      expect(manager.getOnlineUserCount()).toBe(1);

      // 3. Open Tab 2
      manager.registerUser('user-alice', tab2);
      expect(manager.isUserOnline('user-alice')).toBe(true);
      expect(manager.getUserSocketCount('user-alice')).toBe(2);
      expect(manager.getOnlineUserCount()).toBe(1);

      // 4. Open Tab 3
      manager.registerUser('user-alice', tab3);
      expect(manager.isUserOnline('user-alice')).toBe(true);
      expect(manager.getUserSocketCount('user-alice')).toBe(3);
      expect(manager.getOnlineUserCount()).toBe(1);

      // 5. Close Tab 1 - User MUST stay online
      manager.leaveAll(tab1);
      expect(manager.isUserOnline('user-alice')).toBe(true);
      expect(manager.getUserSocketCount('user-alice')).toBe(2);
      expect(manager.getOnlineUserCount()).toBe(1);

      // 6. Close Tab 2 - User MUST stay online
      manager.leaveAll(tab2);
      expect(manager.isUserOnline('user-alice')).toBe(true);
      expect(manager.getUserSocketCount('user-alice')).toBe(1);
      expect(manager.getOnlineUserCount()).toBe(1);

      // 7. Close Tab 3 - User now offline
      manager.leaveAll(tab3);
      expect(manager.isUserOnline('user-alice')).toBe(false);
      expect(manager.getUserSocketCount('user-alice')).toBe(0);
      expect(manager.getOnlineUserCount()).toBe(0);
    });
  });

  describe('Room Pruning and Memory Reclamation', () => {
    it('prunes empty room when last socket leaves via leave()', () => {
      const user1 = createMockSocket('u1');
      const user2 = createMockSocket('u2');

      manager.join('room:alpha', user1);
      manager.join('room:alpha', user2);
      expect(manager.getActiveRoomCount()).toBe(1);
      expect(manager.getRoomMemberCount('room:alpha')).toBe(2);

      // First user leaves room
      manager.leave('room:alpha', user1);
      expect(manager.getActiveRoomCount()).toBe(1);
      expect(manager.getRoomMemberCount('room:alpha')).toBe(1);

      // Second user leaves room
      manager.leave('room:alpha', user2);
      expect(manager.getActiveRoomCount()).toBe(0);
      expect(manager.getRoomMemberCount('room:alpha')).toBe(0);
    });

    it('prunes empty room when last socket leaves via leaveAll()', () => {
      const u1Tab1 = createMockSocket('u1');
      const u1Tab2 = createMockSocket('u1');
      const u2Tab1 = createMockSocket('u2');

      manager.registerUser('u1', u1Tab1);
      manager.registerUser('u1', u1Tab2);
      manager.registerUser('u2', u2Tab1);

      manager.join('room:beta', u1Tab1);
      manager.join('room:beta', u1Tab2);
      manager.join('room:beta', u2Tab1);
      expect(manager.getRoomMemberCount('room:beta')).toBe(3);

      manager.leaveAll(u1Tab1);
      expect(manager.getRoomMemberCount('room:beta')).toBe(2);
      expect(manager.getActiveRoomCount()).toBe(1);

      manager.leaveAll(u1Tab2);
      expect(manager.getRoomMemberCount('room:beta')).toBe(1);
      expect(manager.getActiveRoomCount()).toBe(1);

      manager.leaveAll(u2Tab1);
      expect(manager.getRoomMemberCount('room:beta')).toBe(0);
      expect(manager.getActiveRoomCount()).toBe(0);
    });

    it('cleans up multi-room memberships on leaveAll()', () => {
      const socket = createMockSocket('power-user');
      manager.registerUser('power-user', socket);

      const roomIds = ['room:1', 'room:2', 'room:3', 'room:4', 'room:5'];
      roomIds.forEach((r) => manager.join(r, socket));

      expect(manager.getActiveRoomCount()).toBe(5);
      expect(socket.rooms.size).toBe(5);

      manager.leaveAll(socket);

      expect(manager.getActiveRoomCount()).toBe(0);
      expect(socket.rooms.size).toBe(0);
      expect(manager.isUserOnline('power-user')).toBe(false);
    });
  });

  describe('Broadcast Sender Exclusion & Selective Delivery', () => {
    it('strictly excludes sender socket during room broadcast', () => {
      const sender = createMockSocket('sender');
      const peer1 = createMockSocket('peer1');
      const peer2 = createMockSocket('peer2');
      const peer3 = createMockSocket('peer3');

      const room = 'chat:secure';
      manager.join(room, sender);
      manager.join(room, peer1);
      manager.join(room, peer2);
      manager.join(room, peer3);

      const payload = {
        type: 'message:new',
        payload: { id: 'msg-1', content: 'Secret ping' },
      };

      manager.broadcastToRoom(room, payload, sender);

      // Sender MUST NOT receive its own broadcast
      expect(sender.send).not.toHaveBeenCalled();

      // All peers MUST receive the broadcast exactly once
      const serialized = JSON.stringify(payload);
      expect(peer1.send).toHaveBeenCalledTimes(1);
      expect(peer1.send).toHaveBeenCalledWith(serialized);
      expect(peer2.send).toHaveBeenCalledTimes(1);
      expect(peer2.send).toHaveBeenCalledWith(serialized);
      expect(peer3.send).toHaveBeenCalledTimes(1);
      expect(peer3.send).toHaveBeenCalledWith(serialized);
    });

    it('broadcasts to all when excludeSocket is omitted', () => {
      const s1 = createMockSocket('s1');
      const s2 = createMockSocket('s2');

      manager.join('room:announcement', s1);
      manager.join('room:announcement', s2);

      const payload = { type: 'system:alert', payload: { msg: 'Maintenance' } };
      manager.broadcastToRoom('room:announcement', payload);

      expect(s1.send).toHaveBeenCalledWith(JSON.stringify(payload));
      expect(s2.send).toHaveBeenCalledWith(JSON.stringify(payload));
    });

    it('skips sockets whose readyState is not OPEN (CLOSED or CLOSING)', () => {
      const openSocket = createMockSocket('open');
      const closingSocket = createMockSocket('closing');
      (closingSocket as any).readyState = WebSocket.CLOSING;
      const closedSocket = createMockSocket('closed');
      (closedSocket as any).readyState = WebSocket.CLOSED;

      manager.join('room:check-state', openSocket);
      manager.join('room:check-state', closingSocket);
      manager.join('room:check-state', closedSocket);

      manager.broadcastToRoom('room:check-state', { type: 'ping' });

      expect(openSocket.send).toHaveBeenCalled();
      expect(closingSocket.send).not.toHaveBeenCalled();
      expect(closedSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('High-Concurrency Stress Harness (500 Connections / 100 Users / 50 Rooms)', () => {
    it('maintains consistency under heavy multi-tab and room churn', () => {
      const USER_COUNT = 100;
      const TABS_PER_USER = 5; // 500 total sockets
      const ROOM_COUNT = 50;

      const allSockets: AuthenticatedWebSocket[] = [];

      // 1. Connect 100 users with 5 tabs each (500 sockets)
      for (let u = 0; u < USER_COUNT; u++) {
        const userId = `stress-user-${u}`;
        for (let t = 0; t < TABS_PER_USER; t++) {
          const socket = createMockSocket(userId, `User${u}_Tab${t}`);
          manager.registerUser(userId, socket);
          allSockets.push(socket);

          // Assign each socket to 2 deterministic rooms
          const roomA = `room:${(u + t) % ROOM_COUNT}`;
          const roomB = `room:${(u * 2 + t) % ROOM_COUNT}`;
          manager.join(roomA, socket);
          manager.join(roomB, socket);
        }
      }

      expect(manager.getOnlineUserCount()).toBe(USER_COUNT);
      expect(allSockets.length).toBe(500);
      expect(manager.getActiveRoomCount()).toBe(ROOM_COUNT);

      // Verify every user has 5 active sockets
      for (let u = 0; u < USER_COUNT; u++) {
        expect(manager.getUserSocketCount(`stress-user-${u}`)).toBe(5);
        expect(manager.isUserOnline(`stress-user-${u}`)).toBe(true);
      }

      // 2. Broadcast across all rooms
      for (let r = 0; r < ROOM_COUNT; r++) {
        manager.broadcastToRoom(`room:${r}`, { type: 'message:new', payload: { r } });
      }

      // 3. Disconnect 3 tabs for each user (300 disconnections)
      for (let u = 0; u < USER_COUNT; u++) {
        const userId = `stress-user-${u}`;
        // The first 3 tabs of this user
        const tabsToClose = allSockets.filter((s) => s.userId === userId).slice(0, 3);
        tabsToClose.forEach((sock) => manager.leaveAll(sock));

        // User MUST still be online with 2 tabs remaining
        expect(manager.isUserOnline(userId)).toBe(true);
        expect(manager.getUserSocketCount(userId)).toBe(2);
      }

      // All 100 users must still be online
      expect(manager.getOnlineUserCount()).toBe(USER_COUNT);

      // 4. Disconnect the remaining 2 tabs for the first 50 users
      for (let u = 0; u < 50; u++) {
        const userId = `stress-user-${u}`;
        const remainingTabs = allSockets.filter((s) => s.userId === userId).slice(3, 5);
        remainingTabs.forEach((sock) => manager.leaveAll(sock));

        // First 50 users are now offline
        expect(manager.isUserOnline(userId)).toBe(false);
        expect(manager.getUserSocketCount(userId)).toBe(0);
      }

      // 50 users remain online
      expect(manager.getOnlineUserCount()).toBe(50);

      // 5. Complete full teardown of all remaining sockets
      for (let u = 50; u < USER_COUNT; u++) {
        const userId = `stress-user-${u}`;
        const remainingTabs = allSockets.filter((s) => s.userId === userId).slice(3, 5);
        remainingTabs.forEach((sock) => manager.leaveAll(sock));
      }

      // Zero users and zero rooms should remain (0 memory leaks)
      expect(manager.getOnlineUserCount()).toBe(0);
      expect(manager.getActiveRoomCount()).toBe(0);
    });
  });

  describe('Defensive Edge Cases & Fault Tolerance', () => {
    it('gracefully handles double join to the same room', () => {
      const socket = createMockSocket('u-edge');
      manager.join('room:dup', socket);
      manager.join('room:dup', socket);

      expect(manager.getRoomMemberCount('room:dup')).toBe(1);
      expect(socket.rooms.size).toBe(1);
    });

    it('gracefully handles redundant leave calls', () => {
      const socket = createMockSocket('u-edge');
      manager.join('room:dup', socket);
      manager.leave('room:dup', socket);
      expect(() => manager.leave('room:dup', socket)).not.toThrow();
      expect(manager.getActiveRoomCount()).toBe(0);
    });

    it('gracefully handles leaveAll on an unregistered socket', () => {
      const ghostSocket = createMockSocket('ghost');
      expect(() => manager.leaveAll(ghostSocket)).not.toThrow();
    });

    it('safely handles broadcast to nonexistent room', () => {
      expect(() => {
        manager.broadcastToRoom('room:does-not-exist', { type: 'ping' });
      }).not.toThrow();
    });
  });
});
