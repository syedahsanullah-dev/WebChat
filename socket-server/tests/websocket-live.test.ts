import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { fastify, startServer } from '../src/index.js';
import { roomManager } from '../src/lib/roomManager.js';
import { WsEnvelope } from '../src/types/index.js';

const TEST_PORT = 4096;
const JWT_SECRET = 'your_ultra_secure_256_bit_jwt_secret_key_change_in_production';

function createTestToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '1h' });
}

function waitForMessage(ws: WebSocket): Promise<WsEnvelope> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout waiting for message'));
    }, 4000);

    ws.once('message', (data) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

describe('Empirical Challenger: Live Native WebSocket Wire Protocol Suite', () => {
  beforeAll(async () => {
    process.env.PORT = String(TEST_PORT);
    process.env.HOST = '127.0.0.1';
    await fastify.listen({ port: TEST_PORT, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('rejects connection without authentication token (401)', async () => {
    let rejected = false;
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      ws.on('unexpected-response', (req, res) => {
        expect(res.statusCode).toBe(401);
        rejected = true;
        resolve();
      });
      ws.on('error', () => {
        // ws library emits error on unexpected response
        resolve();
      });
    });
    expect(rejected).toBe(true);
  });

  it('authenticates via JWT query param, sends initial presence, and handles ping/pong', async () => {
    const token = createTestToken('user-jwt-1', 'Alice');
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}?token=${token}`);

    // First message received on connection is user:online presence confirmation
    const welcomeMsg = await waitForMessage(ws);
    expect(welcomeMsg.type).toBe('user:online');
    expect(welcomeMsg.payload.userId).toBe('user-jwt-1');
    expect(welcomeMsg.payload.username).toBe('Alice');

    // Send ping envelope
    ws.send(JSON.stringify({ type: 'ping', payload: {} }));
    const pongMsg = await waitForMessage(ws);
    expect(pongMsg.type).toBe('pong');
    expect(typeof pongMsg.payload.timestamp).toBe('number');

    ws.close();
    await new Promise((r) => setTimeout(r, 100));
  });

  it('verifies multi-tab live presence, sender exclusion on typing, and room cleanup', async () => {
    const tokenUser1 = createTestToken('u-alice', 'Alice');
    const tokenUser2 = createTestToken('u-bob', 'Bob');

    // 1. User 1 opens Tab 1
    const wsU1Tab1 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}?token=${tokenUser1}`);
    await waitForMessage(wsU1Tab1); // initial user:online

    expect(roomManager.isUserOnline('u-alice')).toBe(true);
    expect(roomManager.getUserSocketCount('u-alice')).toBe(1);

    // 2. User 1 opens Tab 2
    const wsU1Tab2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}?token=${tokenUser1}`);
    await waitForMessage(wsU1Tab2); // initial user:online

    expect(roomManager.isUserOnline('u-alice')).toBe(true);
    expect(roomManager.getUserSocketCount('u-alice')).toBe(2);

    // 3. User 2 opens Tab 1
    const wsU2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT}?token=${tokenUser2}`);
    await waitForMessage(wsU2); // initial user:online

    expect(roomManager.isUserOnline('u-bob')).toBe(true);
    expect(roomManager.getOnlineUserCount()).toBe(2);

    // 4. Join room chat:live-channel
    // Retrieve AuthenticatedWebSocket instances from roomManager
    const u1Sockets = (roomManager as any).userSockets.get('u-alice') as Set<any>;
    const u2Sockets = (roomManager as any).userSockets.get('u-bob') as Set<any>;

    const authU1Tab1 = Array.from(u1Sockets)[0];
    const authU2 = Array.from(u2Sockets)[0];

    const roomId = 'live-channel';
    roomManager.join(`chat:${roomId}`, authU1Tab1);
    roomManager.join(`chat:${roomId}`, authU2);

    expect(roomManager.getActiveRoomCount()).toBe(1);
    expect(roomManager.getRoomMemberCount(`chat:${roomId}`)).toBe(2);

    // 5. User 1 sends typing:start from Tab 1
    // Tab 1 (sender) MUST NOT receive it (sender exclusion)
    // User 2 MUST receive typing:start
    const typingPromiseU2 = waitForMessage(wsU2);

    let senderReceivedTyping = false;
    wsU1Tab1.on('message', () => {
      senderReceivedTyping = true;
    });

    wsU1Tab1.send(
      JSON.stringify({
        type: 'typing:start',
        payload: { chatId: roomId, userId: 'u-alice' },
      })
    );

    const receivedTyping = await typingPromiseU2;
    expect(receivedTyping.type).toBe('typing:start');
    expect(receivedTyping.payload.chatId).toBe(roomId);
    expect(senderReceivedTyping).toBe(false);

    // 6. User 1 Tab 1 sends message:send
    const messagePromiseU2 = waitForMessage(wsU2);
    wsU1Tab1.send(
      JSON.stringify({
        type: 'message:send',
        payload: { chatId: roomId, content: 'Live challenge ping' },
      })
    );
    const receivedMsg = await messagePromiseU2;
    expect(receivedMsg.type).toBe('message:send');
    expect(receivedMsg.payload.content).toBe('Live challenge ping');

    // 7. Progressive closure for User 1:
    // Close Tab 1
    wsU1Tab1.close();
    await new Promise((r) => setTimeout(r, 100));

    // User 1 must STILL be online (Tab 2 remains)
    expect(roomManager.isUserOnline('u-alice')).toBe(true);
    expect(roomManager.getUserSocketCount('u-alice')).toBe(1);

    // Close Tab 2
    wsU1Tab2.close();
    await new Promise((r) => setTimeout(r, 100));

    // User 1 is now offline
    expect(roomManager.isUserOnline('u-alice')).toBe(false);
    expect(roomManager.getUserSocketCount('u-alice')).toBe(0);

    // Close User 2
    wsU2.close();
    await new Promise((r) => setTimeout(r, 100));

    expect(roomManager.isUserOnline('u-bob')).toBe(false);
    expect(roomManager.getOnlineUserCount()).toBe(0);
    // Room must be fully pruned
    expect(roomManager.getActiveRoomCount()).toBe(0);
  });
});
