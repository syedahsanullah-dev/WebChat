'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseWebRTCOptions {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const { onIceCandidate, onRemoteStream, onConnectionStateChange } = options;

  const [isMuted, setIsMuted] = useState(false);
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState<number>(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Web Audio Analyser for remote volume detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize or fetch ICE servers (Phase 41: Redundant Google & Cloudflare STUN + TLS TURN port 443)
  const getIceServers = useCallback((): RTCIceServer[] => {
    const servers = [...DEFAULT_ICE_SERVERS];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || 'turn:relay.metered.ca:80';
    const turnTlsUrl =
      process.env.NEXT_PUBLIC_TURN_TLS_URL || 'turns:relay.metered.ca:443?transport=tcp';
    const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnPassword = process.env.NEXT_PUBLIC_TURN_PASSWORD;

    if (turnUsername && turnPassword) {
      servers.push(
        { urls: turnUrl, username: turnUsername, credential: turnPassword },
        { urls: turnTlsUrl, username: turnUsername, credential: turnPassword }
      );
    }
    return servers;
  }, []);

  // Enumerate audio output devices
  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
      setAudioDevices(audioOutputs);
    } catch {
      // Swallowed safely
    }
  }, []);

  useEffect(() => {
    refreshAudioDevices();
  }, [refreshAudioDevices]);

  // Acquire local audio stream (STRICTLY video: false)
  const acquireLocalAudio = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current && localStreamRef.current.active) {
      return localStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // MANDATORY: Audio-only calling, video strictly disabled
      });

      localStreamRef.current = stream;
      setIsMuted(false);
      return stream;
    } catch (err) {
      console.error('[useWebRTC] Failed to acquire microphone stream:', err);
      throw err;
    }
  }, []);

  // Setup Remote Volume Analyser (Phase 42: 10 FPS throttled 100ms interval with hysteresis to eliminate React re-render thrashing)
  const setupVolumeAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastVolume = 0;

      volumeIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));

        // Hysteresis: only trigger React re-render if volume shifted by > 8% or dropped to 0
        if (Math.abs(normalized - lastVolume) > 8 || (normalized === 0 && lastVolume !== 0)) {
          lastVolume = normalized;
          setRemoteVolume(normalized);
        }
      }, 100);
    } catch (err) {
      console.warn('[useWebRTC] Audio volume analyser could not start:', err);
    }
  }, []);

  // Initialize RTCPeerConnection
  const initPeerConnection = useCallback((): RTCPeerConnection => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 2,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsAudioConnected(true);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        setIsAudioConnected(false);
      }
    };

    // Phase 41: Dedicated ICE connection state listener for mobile Wi-Fi/LTE network handovers
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        onConnectionStateChange?.('disconnected' as RTCPeerConnectionState);
      } else if (pc.iceConnectionState === 'failed') {
        onConnectionStateChange?.('failed');
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        onConnectionStateChange?.('connected');
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        onRemoteStream?.(remoteStream);

        // Attach to DOM audio element for automatic playback on mobile Chrome & PWAs
        let audio =
          remoteAudioRef.current ||
          (typeof document !== 'undefined'
            ? (document.getElementById('webchat-remote-audio') as HTMLAudioElement)
            : null);

        if (!audio && typeof document !== 'undefined') {
          audio = document.createElement('audio');
          audio.id = 'webchat-remote-audio';
          audio.autoplay = true;
          (audio as any).playsInline = true;
          audio.setAttribute('playsinline', 'true');
          audio.className = 'hidden';
          document.body.appendChild(audio);
        }

        if (audio) {
          audio.srcObject = remoteStream;
          audio.play().catch((err) => {
            console.warn('[useWebRTC] audio.play() deferred:', err);
          });
          remoteAudioRef.current = audio;
        }

        setupVolumeAnalyser(remoteStream);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [getIceServers, onIceCandidate, onConnectionStateChange, onRemoteStream, setupVolumeAnalyser]);

  // Create Offer (Caller)
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const stream = await acquireLocalAudio();
    const pc = initPeerConnection();

    // Add local audio tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await pc.setLocalDescription(offer);
    return offer;
  }, [acquireLocalAudio, initPeerConnection]);

  // Create Answer (Receiver)
  const createAnswer = useCallback(
    async (remoteOffer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      const stream = await acquireLocalAudio();
      const pc = initPeerConnection();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

      // Process any candidates queued while remote description was null
      if (queuedCandidatesRef.current.length > 0) {
        for (const candidate of queuedCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        queuedCandidatesRef.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    [acquireLocalAudio, initPeerConnection]
  );

  // Set Remote Answer (Caller)
  const setRemoteAnswer = useCallback(async (remoteAnswer: RTCSessionDescriptionInit): Promise<void> => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));

    // Process queued candidates
    if (queuedCandidatesRef.current.length > 0) {
      for (const candidate of queuedCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      queuedCandidatesRef.current = [];
    }
  }, []);

  // Add ICE Candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) {
      queuedCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[useWebRTC] Failed to add ICE candidate:', err);
    }
  }, []);

  // Toggle Mute Microphone
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  // Switch Audio Output Device
  const switchOutputDevice = useCallback(async (deviceId: string) => {
    if (!remoteAudioRef.current || typeof (remoteAudioRef.current as any).setSinkId !== 'function') {
      return false;
    }
    try {
      await (remoteAudioRef.current as any).setSinkId(deviceId);
      setSelectedOutputDevice(deviceId);
      return true;
    } catch (err) {
      console.warn('[useWebRTC] setSinkId failed:', err);
      return false;
    }
  }, []);

  // Phase 41: Automated ICE restart offer generator for network handovers
  const restartIce = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const pc = peerConnectionRef.current;
    if (!pc) throw new Error('No active peer connection');
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    return offer;
  }, []);

  // Phase 41: Access active RTCPeerConnection for WebRTC stats & TURN quota telemetry
  const getPeerConnection = useCallback((): RTCPeerConnection | null => {
    return peerConnectionRef.current;
  }, []);

  // Full Cleanup
  const cleanup = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    queuedCandidatesRef.current = [];
    setIsAudioConnected(false);
    setIsMuted(false);
    setRemoteVolume(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isMuted,
    isAudioConnected,
    remoteVolume,
    audioDevices,
    selectedOutputDevice,
    acquireLocalAudio,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleMute,
    switchOutputDevice,
    restartIce,
    getPeerConnection,
    cleanup,
  };
}
