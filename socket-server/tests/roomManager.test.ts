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

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('registers user and tracks online status', () => {
    const socket = createMockSocket('user-1', 'Alice');
    expect(manager.isUserOnline('user-1')).toBe(false);

    manager.registerUser('user-1', socket);
    expect(manager.isUserOnline('user-1')).toBe(true);
    expect(manager.getUserSocketCount('user-1')).toBe(1);
    expect(manager.getOnlineUserCount()).toBe(1);
  });

  it('supports multiple sockets for the same user (multi-tab)', () => {
    const socket1 = createMockSocket('user-1', 'Alice');
    const socket2 = createMockSocket('user-1', 'Alice');

    manager.registerUser('user-1', socket1);
    manager.registerUser('user-1', socket2);

    expect(manager.getUserSocketCount('user-1')).toBe(2);
    expect(manager.getOnlineUserCount()).toBe(1);
  });

  it('adds socket to room and updates socket.rooms', () => {
    const socket = createMockSocket('user-1');
    manager.join('chat:100', socket);

    expect(socket.rooms.has('chat:100')).toBe(true);
    expect(manager.getRoomMemberCount('chat:100')).toBe(1);
    expect(manager.getActiveRoomCount()).toBe(1);
  });

  it('removes socket from room and prunes empty room', () => {
    const socket = createMockSocket('user-1');
    manager.join('chat:100', socket);
    expect(manager.getActiveRoomCount()).toBe(1);

    manager.leave('chat:100', socket);
    expect(socket.rooms.has('chat:100')).toBe(false);
    expect(manager.getRoomMemberCount('chat:100')).toBe(0);
    expect(manager.getActiveRoomCount()).toBe(0);
  });

  it('leaveAll removes socket from all rooms and user sockets', () => {
    const socket1 = createMockSocket('user-1');
    const socket2 = createMockSocket('user-1');

    manager.registerUser('user-1', socket1);
    manager.registerUser('user-1', socket2);
    manager.join('room:A', socket1);
    manager.join('room:B', socket1);

    expect(manager.getActiveRoomCount()).toBe(2);
    expect(manager.getUserSocketCount('user-1')).toBe(2);

    manager.leaveAll(socket1);

    expect(socket1.rooms.size).toBe(0);
    expect(manager.getActiveRoomCount()).toBe(0);
    // User still has socket2 online
    expect(manager.isUserOnline('user-1')).toBe(true);
    expect(manager.getUserSocketCount('user-1')).toBe(1);

    manager.leaveAll(socket2);
    expect(manager.isUserOnline('user-1')).toBe(false);
    expect(manager.getOnlineUserCount()).toBe(0);
  });

  it('broadcastToRoom sends message to all open sockets excluding sender', () => {
    const socketSender = createMockSocket('user-1');
    const socketReceiver1 = createMockSocket('user-2');
    const socketReceiver2 = createMockSocket('user-3');
    const socketClosed = createMockSocket('user-4');
    (socketClosed as any).readyState = WebSocket.CLOSED;

    manager.join('chat:general', socketSender);
    manager.join('chat:general', socketReceiver1);
    manager.join('chat:general', socketReceiver2);
    manager.join('chat:general', socketClosed);

    const payload = { type: 'message:new', payload: { content: 'hello' } };
    manager.broadcastToRoom('chat:general', payload, socketSender);

    expect(socketSender.send).not.toHaveBeenCalled();
    expect(socketReceiver1.send).toHaveBeenCalledWith(JSON.stringify(payload));
    expect(socketReceiver2.send).toHaveBeenCalledWith(JSON.stringify(payload));
    expect(socketClosed.send).not.toHaveBeenCalled();
  });

  it('sendToUser routes message to all open sockets of target user only', () => {
    const socketA1 = createMockSocket('user-A');
    const socketA2 = createMockSocket('user-A');
    const socketB = createMockSocket('user-B');

    manager.registerUser('user-A', socketA1);
    manager.registerUser('user-A', socketA2);
    manager.registerUser('user-B', socketB);

    const message = { type: 'audio-call:ring', payload: { callId: 'call-1' } };
    manager.sendToUser('user-A', message);

    expect(socketA1.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(socketA2.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(socketB.send).not.toHaveBeenCalled();
  });

  it('sendToUser is safe when user is offline', () => {
    expect(() => {
      manager.sendToUser('offline-user', { type: 'ping' });
    }).not.toThrow();
  });
});
