import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { roomManager, AuthenticatedWebSocket } from '../src/lib/roomManager.js';
import {
  handleCallInvite,
  handleCallRing,
  handleCallAccept,
  handleCallReject,
  handleCallEnd,
  handleCallMute,
  handleCallIceRestart,
  handleCallIceRestartAnswer,
  handleSocketDisconnectForCalls,
  activeSessions,
} from '../src/handlers/callSignalingHandler.js';
import { WsEnvelope } from '../src/types/index.js';

// Mock Prisma
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    chatParticipant: {
      findFirst: vi.fn().mockResolvedValue({ chatId: 'chat-direct-1' }),
    },
    chat: {
      create: vi.fn().mockResolvedValue({ id: 'chat-auto-created' }),
    },
    callLog: {
      create: vi.fn().mockResolvedValue({ id: 'call-log-1' }),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    message: {
      create: vi.fn().mockResolvedValue({
        id: 'msg-call-1',
        createdAt: new Date(),
        sender: null,
      }),
    },
  },
}));

function createMockSocket(userId: string, username = 'testuser'): {
  socket: AuthenticatedWebSocket;
  sent: WsEnvelope[];
} {
  const sent: WsEnvelope[] = [];
  const socket = {
    userId,
    username,
    isAlive: true,
    readyState: 1, // WebSocket.OPEN
    rooms: new Set<string>(),
    send: vi.fn((data: string) => {
      try {
        sent.push(JSON.parse(data));
      } catch {}
    }),
  } as unknown as AuthenticatedWebSocket;

  return { socket, sent };
}

describe('Phase 43: Server #2 Call Signaling Handler Tests (Fastify + ws)', () => {
  let alice: ReturnType<typeof createMockSocket>;
  let bob: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    roomManager.clear();
    activeSessions.clear();

    alice = createMockSocket('user-alice', 'Alice');
    bob = createMockSocket('user-bob', 'Bob');

    roomManager.registerUser('user-alice', alice.socket);
    roomManager.registerUser('user-bob', bob.socket);
  });

  afterEach(() => {
    roomManager.clear();
    activeSessions.clear();
  });

  it('1. handleCallInvite dispatches audio-call:incoming to online callee', async () => {
    await handleCallInvite(alice.socket, {
      callId: 'call-101',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      sdpOffer: { type: 'offer', sdp: 'v=0\r\no=alice' },
    });

    // Bob receives audio-call:incoming
    const incoming = bob.sent.find((e) => e.type === 'audio-call:incoming');
    expect(incoming).toBeDefined();
    expect(incoming?.payload.callId).toBe('call-101');
    expect(incoming?.payload.callerId).toBe('user-alice');
    expect(incoming?.payload.callerName).toBe('Alice');

    // Session is registered in activeSessions
    const session = activeSessions.get('call-101');
    expect(session).toBeDefined();
    expect(session?.status).toBe('ringing');
  });

  it('2. handleCallInvite rejects as busy if callee is already engaged in active call', async () => {
    // Pre-populate an active call for Bob
    activeSessions.set('call-existing', {
      callId: 'call-existing',
      chatId: 'chat-bc',
      callerId: 'user-bob',
      callerName: 'Bob',
      callerAvatar: null,
      receiverId: 'user-charlie',
      status: 'connected',
      startedAt: new Date(),
    });

    await handleCallInvite(alice.socket, {
      callId: 'call-clash',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      sdpOffer: { type: 'offer', sdp: 'v=0' },
    });

    // Alice immediately receives audio-call:busy
    const busy = alice.sent.find((e) => e.type === 'audio-call:busy');
    expect(busy).toBeDefined();
    expect(busy?.payload.callId).toBe('call-clash');
  });

  it('3. handleCallRing forwards ringing acknowledgment to caller', () => {
    activeSessions.set('call-ring-test', {
      callId: 'call-ring-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'ringing',
      startedAt: new Date(),
    });

    handleCallRing(bob.socket, {
      callId: 'call-ring-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
    });

    const ringEnvelope = alice.sent.find((e) => e.type === 'audio-call:ring');
    expect(ringEnvelope).toBeDefined();
    expect(ringEnvelope?.payload.callId).toBe('call-ring-test');
  });

  it('4. handleCallAccept dismisses auxiliary tabs and forwards accepted to caller', () => {
    // Register second tab for Bob
    const bobTab2 = createMockSocket('user-bob', 'Bob');
    roomManager.registerUser('user-bob', bobTab2.socket);

    activeSessions.set('call-accept-test', {
      callId: 'call-accept-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'ringing',
      startedAt: new Date(),
    });

    // Bob accepts on tab 1
    handleCallAccept(bob.socket, {
      callId: 'call-accept-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
      sdpAnswer: { type: 'answer', sdp: 'v=0\r\no=bob-answer' },
    });

    // Alice receives audio-call:accepted
    const accepted = alice.sent.find((e) => e.type === 'audio-call:accepted');
    expect(accepted).toBeDefined();
    expect(accepted?.payload.sdpAnswer.sdp).toBe('v=0\r\no=bob-answer');

    // Bob's tab 2 receives audio-call:answered_elsewhere
    const dismissed = bobTab2.sent.find((e) => e.type === 'audio-call:answered_elsewhere');
    expect(dismissed).toBeDefined();

    // Session is connected
    const session = activeSessions.get('call-accept-test');
    expect(session?.status).toBe('connected');
  });

  it('5. handleCallReject notifies caller and clears session', async () => {
    activeSessions.set('call-reject-test', {
      callId: 'call-reject-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'ringing',
      startedAt: new Date(),
    });

    await handleCallReject(bob.socket, {
      callId: 'call-reject-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
      reason: 'declined',
    });

    // Alice receives reject
    const reject = alice.sent.find((e) => e.type === 'audio-call:reject');
    expect(reject).toBeDefined();
    expect(reject?.payload.reason).toBe('declined');

    // Session removed from activeSessions
    expect(activeSessions.has('call-reject-test')).toBe(false);
  });

  it('6. handleCallEnd hangs up active call and informs peer', async () => {
    activeSessions.set('call-end-test', {
      callId: 'call-end-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'connected',
      startedAt: new Date(),
      connectedAt: new Date(Date.now() - 35000), // 35 seconds ago
    });

    await handleCallEnd(alice.socket, {
      callId: 'call-end-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
      duration: 35,
    });

    const ended = bob.sent.find((e) => e.type === 'audio-call:ended');
    expect(ended).toBeDefined();
    expect(ended?.payload.duration).toBe(35);
    expect(ended?.payload.status).toBe('completed');

    expect(activeSessions.has('call-end-test')).toBe(false);
  });

  it('7. handleSocketDisconnectForCalls terminates call and informs peer on socket drop', async () => {
    activeSessions.set('call-dc-test', {
      callId: 'call-dc-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'connected',
      startedAt: new Date(),
      connectedAt: new Date(Date.now() - 10000),
    });

    // Alice suddenly loses connection
    await handleSocketDisconnectForCalls(alice.socket);

    // Bob receives audio-call:ended with reason 'peer_disconnected'
    const ended = bob.sent.find((e) => e.type === 'audio-call:ended');
    expect(ended).toBeDefined();
    expect(ended?.payload.reason).toBe('peer_disconnected');

    // Session removed preventing zombie memory leaks
    expect(activeSessions.has('call-dc-test')).toBe(false);
  });

  it('8. handleCallMute forwards peer mute status', () => {
    activeSessions.set('call-mute-test', {
      callId: 'call-mute-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'connected',
      startedAt: new Date(),
    });

    handleCallMute(alice.socket, {
      callId: 'call-mute-test',
      chatId: 'chat-ab',
      userId: 'user-alice',
      isMuted: true,
    });

    const muteEnvelope = bob.sent.find((e) => e.type === 'audio-call:mute');
    expect(muteEnvelope).toBeDefined();
    expect(muteEnvelope?.payload.isMuted).toBe(true);
    expect(muteEnvelope?.payload.userId).toBe('user-alice');
  });

  it('9. handleCallIceRestart and answer forwards renegotiation between peers', () => {
    activeSessions.set('call-ice-restart-test', {
      callId: 'call-ice-restart-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      callerName: 'Alice',
      callerAvatar: null,
      receiverId: 'user-bob',
      status: 'connected',
      startedAt: new Date(),
    });

    // Offerer sends ICE restart offer
    handleCallIceRestart(alice.socket, {
      callId: 'call-ice-restart-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
      sdpOffer: { type: 'offer', sdp: 'v=0\r\no=restart-offer' },
    });

    const restartOffer = bob.sent.find((e) => e.type === 'audio-call:ice-restart');
    expect(restartOffer).toBeDefined();
    expect(restartOffer?.payload.sdpOffer.sdp).toBe('v=0\r\no=restart-offer');

    // Answerer responds with answer
    handleCallIceRestartAnswer(bob.socket, {
      callId: 'call-ice-restart-test',
      chatId: 'chat-ab',
      callerId: 'user-alice',
      receiverId: 'user-bob',
      sdpAnswer: { type: 'answer', sdp: 'v=0\r\no=restart-answer' },
    });

    const restartAnswer = alice.sent.find((e) => e.type === 'audio-call:ice-restart-answer');
    expect(restartAnswer).toBeDefined();
    expect(restartAnswer?.payload.sdpAnswer.sdp).toBe('v=0\r\no=restart-answer');
  });
});
