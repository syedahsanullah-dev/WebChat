import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { roomManager, AuthenticatedWebSocket } from '../src/lib/roomManager.js';
import { handleMessageSend, handleMessageRead } from '../src/handlers/messageHandler.js';
import { WsEnvelope } from '../src/types/index.js';

describe('Server #2 Direct Messaging Pipeline (Fastify + Native ws)', () => {
  let mockSocketA: AuthenticatedWebSocket;
  let mockSocketB: AuthenticatedWebSocket;
  let sentEnvelopesA: WsEnvelope[];
  let sentEnvelopesB: WsEnvelope[];

  beforeEach(() => {
    roomManager.clear();
    sentEnvelopesA = [];
    sentEnvelopesB = [];

    mockSocketA = {
      userId: 'user-a',
      username: 'Alice',
      isAlive: true,
      readyState: 1, // WebSocket.OPEN
      rooms: new Set<string>(),
      send: vi.fn((data: string) => {
        try {
          sentEnvelopesA.push(JSON.parse(data));
        } catch {}
      }),
    } as unknown as AuthenticatedWebSocket;

    mockSocketB = {
      userId: 'user-b',
      username: 'Bob',
      isAlive: true,
      readyState: 1,
      rooms: new Set<string>(),
      send: vi.fn((data: string) => {
        try {
          sentEnvelopesB.push(JSON.parse(data));
        } catch {}
      }),
    } as unknown as AuthenticatedWebSocket;
  });

  afterEach(() => {
    roomManager.clear();
  });

  it('handleMessageSend acks sender with message:ack (status: sent) when recipient is offline', async () => {
    // Only User A is connected
    roomManager.registerUser('user-a', mockSocketA);

    await handleMessageSend(mockSocketA, {
      tempId: 'temp-111',
      chatId: 'chat-ab',
      recipientId: 'user-b',
      content: 'Hey Bob, are you there?',
    });

    // Sender must receive message:ack
    const ack = sentEnvelopesA.find((e) => e.type === 'message:ack');
    expect(ack).toBeDefined();
    expect(ack?.payload.tempId).toBe('temp-111');
    expect(ack?.payload.chatId).toBe('chat-ab');
    expect(ack?.payload.status).toBe('sent');
    expect(ack?.payload.messageId).toBeDefined();
  });

  it('handleMessageSend delivers message:new to recipient and message:status (delivered) to sender when online', async () => {
    // Both User A and User B are connected
    roomManager.registerUser('user-a', mockSocketA);
    roomManager.registerUser('user-b', mockSocketB);
    roomManager.join('chat:chat-ab', mockSocketA);
    roomManager.join('chat:chat-ab', mockSocketB);

    await handleMessageSend(mockSocketA, {
      tempId: 'temp-222',
      chatId: 'chat-ab',
      recipientId: 'user-b',
      content: 'Live real-time messaging on Fastify!',
    });

    // 1. Sender User A receives message:ack
    const ack = sentEnvelopesA.find((e) => e.type === 'message:ack');
    expect(ack).toBeDefined();
    expect(ack?.payload.tempId).toBe('temp-222');
    expect(ack?.payload.status).toBe('delivered');

    // 2. Recipient User B receives message:new
    const newMsg = sentEnvelopesB.find((e) => e.type === 'message:new');
    expect(newMsg).toBeDefined();
    expect(newMsg?.payload.content).toBe('Live real-time messaging on Fastify!');
    expect(newMsg?.payload.senderId).toBe('user-a');
    expect(newMsg?.payload.status).toBe('delivered');

    // 3. Sender User A receives message:status (delivered)
    const statusUpdate = sentEnvelopesA.find(
      (e) => e.type === 'message:status' && e.payload.status === 'delivered'
    );
    expect(statusUpdate).toBeDefined();
    expect(statusUpdate?.payload.chatId).toBe('chat-ab');
  });

  it('handleMessageRead broadcasts status: read to chat participants', async () => {
    roomManager.registerUser('user-a', mockSocketA);
    roomManager.registerUser('user-b', mockSocketB);
    roomManager.join('chat:chat-ab', mockSocketA);
    roomManager.join('chat:chat-ab', mockSocketB);

    // User B reads the chat
    await handleMessageRead(mockSocketB, {
      chatId: 'chat-ab',
      userId: 'user-a',
    });

    // User A receives status: read (double blue tick receipt)
    const readStatus = sentEnvelopesA.find(
      (e) => e.type === 'message:status' && e.payload.status === 'read'
    );
    expect(readStatus).toBeDefined();
    expect(readStatus?.payload.chatId).toBe('chat-ab');
    expect(readStatus?.payload.status).toBe('read');
    expect(readStatus?.payload.userId).toBe('user-b');
  });
});
