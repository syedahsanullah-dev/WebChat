import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebRTC } from '@/hooks/useWebRTC';

describe('Phase 43: WebRTC Hook Unit Tests (RTCPeerConnection & MediaStream Lifecycle)', () => {
  let mockTrack: {
    kind: string;
    enabled: boolean;
    stop: ReturnType<typeof vi.fn>;
  };
  let mockStream: {
    active: boolean;
    getTracks: ReturnType<typeof vi.fn>;
    getAudioTracks: ReturnType<typeof vi.fn>;
  };
  let mockPeerConnectionInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    };

    mockStream = {
      active: true,
      getTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => [mockTrack]),
    };

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'audiooutput', deviceId: 'default', label: 'Default Speaker' },
          { kind: 'audiooutput', deviceId: 'headphones', label: 'Headphones' },
        ]),
      },
    });

    // Mock RTCPeerConnection
    mockPeerConnectionInstance = {
      connectionState: 'new',
      iceConnectionState: 'new',
      addTrack: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'v=0\r\no=mock-offer' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'v=0\r\no=mock-answer' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      getStats: vi.fn().mockResolvedValue(new Map()),
      onicecandidate: null,
      onconnectionstatechange: null,
      oniceconnectionstatechange: null,
      ontrack: null,
    };

    (global as any).RTCPeerConnection = vi.fn().mockImplementation(() => mockPeerConnectionInstance);
    (global as any).RTCSessionDescription = vi.fn().mockImplementation((desc) => desc);
    (global as any).RTCIceCandidate = vi.fn().mockImplementation((cand) => cand);

    // Mock AudioContext & AnalyserNode
    const mockAnalyser = {
      fftSize: 64,
      smoothingTimeConstant: 0.5,
      frequencyBinCount: 32,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
    };
    (global as any).AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
      createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
      close: vi.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. acquireLocalAudio requests audio: true and strictly video: false', async () => {
    const { result } = renderHook(() => useWebRTC());

    let stream: any;
    await act(async () => {
      stream = await result.current.acquireLocalAudio();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false, // MANDATORY: Audio-only calling constraint enforced
    });
    expect(stream).toBe(mockStream);
    expect(result.current.isMuted).toBe(false);
  });

  it('2. createOffer adds local audio tracks and sets local description', async () => {
    const { result } = renderHook(() => useWebRTC());

    let offer: any;
    await act(async () => {
      offer = await result.current.createOffer();
    });

    expect(mockPeerConnectionInstance.addTrack).toHaveBeenCalledWith(mockTrack, mockStream);
    expect(mockPeerConnectionInstance.createOffer).toHaveBeenCalledWith({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    expect(mockPeerConnectionInstance.setLocalDescription).toHaveBeenCalledWith({
      type: 'offer',
      sdp: 'v=0\r\no=mock-offer',
    });
    expect(offer.type).toBe('offer');
  });

  it('3. createAnswer sets remote description and produces answer SDP', async () => {
    const { result } = renderHook(() => useWebRTC());

    const incomingOffer: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: 'v=0\r\no=remote-offer',
    };

    let answer: any;
    await act(async () => {
      answer = await result.current.createAnswer(incomingOffer);
    });

    expect(mockPeerConnectionInstance.setRemoteDescription).toHaveBeenCalledWith(incomingOffer);
    expect(mockPeerConnectionInstance.createAnswer).toHaveBeenCalled();
    expect(mockPeerConnectionInstance.setLocalDescription).toHaveBeenCalledWith({
      type: 'answer',
      sdp: 'v=0\r\no=mock-answer',
    });
    expect(answer.type).toBe('answer');
  });

  it('4. addIceCandidate queues candidates until remote description is set', async () => {
    const { result } = renderHook(() => useWebRTC());

    // Peer connection initialized but remote description not set
    await act(async () => {
      await result.current.createOffer();
    });

    const candidate: RTCIceCandidateInit = {
      candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    };

    // Add candidate before remote description is received: queued
    act(() => {
      result.current.addIceCandidate(candidate);
    });
    expect(mockPeerConnectionInstance.addIceCandidate).not.toHaveBeenCalled();

    // Now set remote answer: queued candidate should be dispatched
    await act(async () => {
      await result.current.setRemoteAnswer({ type: 'answer', sdp: 'v=0\r\no=answer' });
    });

    expect(mockPeerConnectionInstance.setRemoteDescription).toHaveBeenCalled();
    expect(mockPeerConnectionInstance.addIceCandidate).toHaveBeenCalledWith(candidate);
  });

  it('5. toggleMute inverts track.enabled state', async () => {
    const { result } = renderHook(() => useWebRTC());

    await act(async () => {
      await result.current.acquireLocalAudio();
    });

    expect(result.current.isMuted).toBe(false);
    expect(mockTrack.enabled).toBe(true);

    // Mute microphone
    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);
    expect(mockTrack.enabled).toBe(false);

    // Unmute microphone
    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(false);
    expect(mockTrack.enabled).toBe(true);
  });

  it('6. restartIce creates offer with iceRestart: true for network handover recovery', async () => {
    const { result } = renderHook(() => useWebRTC());

    await act(async () => {
      await result.current.createOffer();
    });

    mockPeerConnectionInstance.createOffer.mockResolvedValueOnce({
      type: 'offer',
      sdp: 'v=0\r\no=ice-restart-offer',
    });

    let restartOffer: any;
    await act(async () => {
      restartOffer = await result.current.restartIce();
    });

    expect(mockPeerConnectionInstance.createOffer).toHaveBeenCalledWith({ iceRestart: true });
    expect(mockPeerConnectionInstance.setLocalDescription).toHaveBeenCalledWith({
      type: 'offer',
      sdp: 'v=0\r\no=ice-restart-offer',
    });
    expect(restartOffer.sdp).toBe('v=0\r\no=ice-restart-offer');
  });

  it('7. cleanup halts media tracks and closes peer connection cleanly', async () => {
    const { result } = renderHook(() => useWebRTC());

    await act(async () => {
      await result.current.createOffer();
    });

    act(() => {
      result.current.cleanup();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockPeerConnectionInstance.close).toHaveBeenCalled();
    expect(result.current.isAudioConnected).toBe(false);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.remoteVolume).toBe(0);
  });
});
