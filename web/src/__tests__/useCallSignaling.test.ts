import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallSignaling } from '@/hooks/useCallSignaling';
import * as WebSocketContextModule from '@/context/WebSocketContext';
import * as AuthContextModule from '@/context/AuthContext';
import * as WebRTCModule from '@/hooks/useWebRTC';
import * as AudioModule from '@/lib/audio';

describe('Phase 43: Voice Call Signaling Hook Tests (State Machine & WebSocket Envelopes)', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let subscribers: Record<string, (payload: any) => void>;
  let mockWebRTC: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockSend = vi.fn();
    subscribers = {};

    vi.spyOn(WebSocketContextModule, 'useWebSocket').mockReturnValue({
      status: 'connected',
      isConnected: true,
      send: mockSend,
      subscribe: vi.fn((type: string, cb: (payload: any) => void) => {
        subscribers[type] = cb;
        return () => {
          delete subscribers[type];
        };
      }),
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'alice-id',
        username: 'alice',
        displayName: 'Alice Cooper',
        avatarUrl: null,
        email: 'alice@test.com',
        about: '',
        isOnline: true,
      },
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      updateProfile: vi.fn(),
      updateAvatar: vi.fn(),
    });

    mockWebRTC = {
      isMuted: false,
      isAudioConnected: false,
      remoteVolume: 0,
      audioDevices: [],
      selectedOutputDevice: '',
      acquireLocalAudio: vi.fn().mockResolvedValue({}),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'v=0\r\no=alice-offer' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'v=0\r\no=bob-answer' }),
      setRemoteAnswer: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn(),
      toggleMute: vi.fn(),
      switchOutputDevice: vi.fn().mockResolvedValue(true),
      restartIce: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'v=0\r\no=ice-restart' }),
      getPeerConnection: vi.fn().mockReturnValue(null),
      cleanup: vi.fn(),
    };
    vi.spyOn(WebRTCModule, 'useWebRTC').mockReturnValue(mockWebRTC);

    vi.spyOn(AudioModule, 'startRingtone').mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. initializes in idle state with zero call duration', () => {
    const { result } = renderHook(() => useCallSignaling());

    expect(result.current.callState).toBe('idle');
    expect(result.current.callData).toBeNull();
    expect(result.current.callDuration).toBe(0);
    expect(result.current.isRemoteMuted).toBe(false);
  });

  it('2. startCall transitions to outgoing_calling and dispatches audio-call:invite envelope', async () => {
    const { result } = renderHook(() => useCallSignaling());

    await act(async () => {
      await result.current.startCall({
        chatId: 'chat-101',
        recipientId: 'bob-id',
        recipientName: 'Bob Dylan',
        recipientUsername: 'bob',
        recipientAvatar: null,
      });
    });

    expect(result.current.callState).toBe('outgoing_calling');
    expect(result.current.callData?.caller.id).toBe('alice-id');
    expect(result.current.callData?.receiver.id).toBe('bob-id');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio-call:invite',
        payload: expect.objectContaining({
          chatId: 'chat-101',
          callerId: 'alice-id',
          receiverId: 'bob-id',
          sdpOffer: expect.objectContaining({ type: 'offer' }),
        }),
      })
    );
  });

  it('3. audio-call:ring updates outgoing caller state to outgoing_ringing', async () => {
    const { result } = renderHook(() => useCallSignaling());

    await act(async () => {
      await result.current.startCall({
        chatId: 'chat-101',
        recipientId: 'bob-id',
        recipientName: 'Bob Dylan',
      });
    });

    expect(result.current.callState).toBe('outgoing_calling');

    act(() => {
      subscribers['audio-call:ring']?.({
        callId: result.current.callData?.callId,
        chatId: 'chat-101',
        callerId: 'alice-id',
        receiverId: 'bob-id',
      });
    });

    expect(result.current.callState).toBe('outgoing_ringing');
  });

  it('4. audio-call:accepted transitions caller to connected and establishes audio session', async () => {
    const { result } = renderHook(() => useCallSignaling());

    await act(async () => {
      await result.current.startCall({
        chatId: 'chat-101',
        recipientId: 'bob-id',
        recipientName: 'Bob Dylan',
      });
    });

    await act(async () => {
      await subscribers['audio-call:accepted']?.({
        callId: result.current.callData?.callId,
        chatId: 'chat-101',
        callerId: 'alice-id',
        receiverId: 'bob-id',
        answerSdp: { type: 'answer', sdp: 'v=0\r\no=bob-answer' },
      });
    });

    expect(mockWebRTC.setRemoteAnswer).toHaveBeenCalledWith({
      type: 'answer',
      sdp: 'v=0\r\no=bob-answer',
    });
    expect(result.current.callState).toBe('connected');
  });

  it('5. incoming call invite transitions callee to incoming_ringing and replies with audio-call:ring', async () => {
    const { result } = renderHook(() => useCallSignaling());

    act(() => {
      subscribers['audio-call:incoming']?.({
        callId: 'call-xyz',
        chatId: 'chat-101',
        callerId: 'bob-id',
        callerName: 'Bob Dylan',
        callerAvatar: null,
        receiverId: 'alice-id',
        offerSdp: { type: 'offer', sdp: 'v=0\r\no=bob-offer' },
      });
    });

    expect(result.current.callState).toBe('incoming_ringing');
    expect(result.current.callData?.caller.name).toBe('Bob Dylan');
    expect(result.current.callData?.isCaller).toBe(false);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio-call:ring',
        payload: expect.objectContaining({
          callId: 'call-xyz',
          callerId: 'bob-id',
          receiverId: 'alice-id',
        }),
      })
    );
  });

  it('6. callee rejects as busy if another incoming call arrives while already in active call', async () => {
    const { result } = renderHook(() => useCallSignaling());

    // Enter active call
    await act(async () => {
      await result.current.startCall({
        chatId: 'chat-101',
        recipientId: 'bob-id',
        recipientName: 'Bob Dylan',
      });
    });

    // 2nd caller tries to call alice
    act(() => {
      subscribers['audio-call:incoming']?.({
        callId: 'call-2nd',
        chatId: 'chat-102',
        callerId: 'charlie-id',
        callerName: 'Charlie',
        receiverId: 'alice-id',
        offerSdp: { type: 'offer', sdp: 'v=0' },
      });
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio-call:busy',
        payload: expect.objectContaining({
          callId: 'call-2nd',
          callerId: 'charlie-id',
          receiverId: 'alice-id',
        }),
      })
    );
  });

  it('7. callee 45-second timeout automatically triggers rejectCall("timeout")', async () => {
    const { result } = renderHook(() => useCallSignaling());

    act(() => {
      subscribers['audio-call:incoming']?.({
        callId: 'call-timeout-test',
        chatId: 'chat-101',
        callerId: 'bob-id',
        callerName: 'Bob Dylan',
        receiverId: 'alice-id',
        offerSdp: { type: 'offer', sdp: 'v=0' },
      });
    });

    expect(result.current.callState).toBe('incoming_ringing');

    // Fast-forward 45 seconds without callee tapping Accept
    act(() => {
      vi.advanceTimersByTime(45000);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio-call:reject',
        payload: expect.objectContaining({
          callId: 'call-timeout-test',
          reason: 'timeout',
        }),
      })
    );
  });

  it('8. audio-call:answered_elsewhere dismisses ringing across secondary tabs', async () => {
    const { result } = renderHook(() => useCallSignaling());

    act(() => {
      subscribers['audio-call:incoming']?.({
        callId: 'call-multi-tab',
        chatId: 'chat-101',
        callerId: 'bob-id',
        callerName: 'Bob Dylan',
        receiverId: 'alice-id',
        offerSdp: { type: 'offer', sdp: 'v=0' },
      });
    });

    expect(result.current.callState).toBe('incoming_ringing');

    // Secondary tab answered
    act(() => {
      subscribers['audio-call:answered_elsewhere']?.({
        callId: 'call-multi-tab',
        answeredByDevice: 'tab-2',
      });
    });

    expect(result.current.callState).toBe('ended');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.callState).toBe('idle');
  });

  it('9. toggleMute informs peer via audio-call:mute and synchronizes remote mute state', async () => {
    const { result } = renderHook(() => useCallSignaling());

    // Enter connected call
    await act(async () => {
      await result.current.startCall({
        chatId: 'chat-101',
        recipientId: 'bob-id',
        recipientName: 'Bob Dylan',
      });
    });
    await act(async () => {
      await subscribers['audio-call:accepted']?.({
        callId: result.current.callData?.callId,
        answerSdp: { type: 'answer', sdp: 'v=0' },
      });
    });

    // Mute microphone
    act(() => {
      result.current.toggleMute();
    });

    expect(mockWebRTC.toggleMute).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'audio-call:mute',
        payload: expect.objectContaining({
          callId: result.current.callData?.callId,
          isMuted: true,
        }),
      })
    );

    // Peer mutes their mic
    act(() => {
      subscribers['audio-call:mute']?.({
        callId: result.current.callData?.callId,
        isMuted: true,
      });
    });

    expect(result.current.isRemoteMuted).toBe(true);
  });
});
