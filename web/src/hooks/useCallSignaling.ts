'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { useWebRTC } from './useWebRTC';
import { startRingtone } from '@/lib/audio';
import {
  AudioCallInvitePayload,
  AudioCallIncomingPayload,
  AudioCallRingPayload,
  AudioCallAcceptPayload,
  AudioCallAcceptedPayload,
  AudioCallRejectPayload,
  AudioCallBusyPayload,
  AudioCallIceCandidatePayload,
  AudioCallEndPayload,
  AudioCallEndedPayload,
} from '@shared/events';

export type CallState =
  | 'idle'
  | 'outgoing_calling'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'ended';

export interface CallParticipant {
  id: string;
  name: string;
  username?: string;
  avatar?: string | null;
}

export interface ActiveCallData {
  callId: string;
  chatId: string;
  caller: CallParticipant;
  receiver: CallParticipant;
  isCaller: boolean;
  duration: number;
  offerSdp?: any;
}

export function useCallSignaling() {
  const { user } = useAuth();
  const { send, subscribe } = useWebSocket();

  const [callState, setCallState] = useState<CallState>('idle');
  const [callData, setCallData] = useState<ActiveCallData | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);

  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callDataRef = useRef<ActiveCallData | null>(null);
  callDataRef.current = callData;

  const callStateRef = useRef<CallState>('idle');
  callStateRef.current = callState;

  // WebRTC hook
  const webRTC = useWebRTC({
    onIceCandidate: (candidate) => {
      const active = callDataRef.current;
      if (!active) return;
      const targetReceiverId = active.isCaller ? active.receiver.id : active.caller.id;
      send<AudioCallIceCandidatePayload>({
        type: 'audio-call:ice-candidate',
        payload: {
          callId: active.callId,
          chatId: active.chatId,
          callerId: active.caller.id,
          senderId: user?.id,
          receiverId: targetReceiverId,
          candidate: candidate.toJSON(),
        },
      });
    },
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setCallState('connected');
      } else if (state === 'failed' || state === 'closed') {
        if (callStateRef.current === 'connected') {
          handleEndCall('connection_lost');
        }
      }
    },
  });

  // Stop Ringtone audio loop safely
  const stopRingtoneSound = useCallback(() => {
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
  }, []);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callState]);

  // Clean transition to ended then idle
  const transitionToEnded = useCallback((delayMs = 1200) => {
    stopRingtoneSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(0); } catch {}
    }
    webRTC.cleanup();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCallData(null);
      setCallDuration(0);
    }, delayMs);
  }, [stopRingtoneSound, webRTC]);

  // 1. Start Outgoing Call
  const startCall = useCallback(
    async (params: {
      chatId: string;
      recipientId: string;
      recipientName: string;
      recipientUsername?: string;
      recipientAvatar?: string | null;
    }) => {
      if (!user) return;
      if (callStateRef.current !== 'idle') return;

      // Unlock mobile audio element on user tap
      if (typeof document !== 'undefined') {
        const el = document.getElementById('webchat-remote-audio') as HTMLAudioElement;
        if (el) el.play().catch(() => {});
      }

      const callId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const newCallData: ActiveCallData = {
        callId,
        chatId: params.chatId,
        caller: {
          id: user.id,
          name: user.displayName || `@${user.username}`,
          username: user.username,
          avatar: user.avatarUrl,
        },
        receiver: {
          id: params.recipientId,
          name: params.recipientName,
          username: params.recipientUsername,
          avatar: params.recipientAvatar,
        },
        isCaller: true,
        duration: 0,
      };

      setCallData(newCallData);
      setCallState('outgoing_calling');

      try {
        // Start local ringtone feedback for caller
        ringtoneStopRef.current = startRingtone();

        // Create WebRTC Offer
        const offer = await webRTC.createOffer();

        // Dispatch invite to server #2
        send<AudioCallInvitePayload>({
          type: 'audio-call:invite',
          payload: {
            callId,
            chatId: params.chatId,
            callerId: user.id,
            callerName: user.displayName || `@${user.username}`,
            callerAvatar: user.avatarUrl,
            receiverId: params.recipientId,
            sdpOffer: offer,
            offerSdp: offer,
          },
        });

        // 45s ringing timeout
        callTimeoutRef.current = setTimeout(() => {
          if (callStateRef.current === 'outgoing_calling' || callStateRef.current === 'outgoing_ringing') {
            handleEndCall('no_answer');
          }
        }, 45000);
      } catch (err) {
        console.error('[useCallSignaling] Error starting call:', err);
        transitionToEnded(0);
        alert('Could not access microphone. Please grant audio permissions to start voice calls.');
      }
    },
    [user, webRTC, send, transitionToEnded]
  );

  // 2. Accept Incoming Call
  const acceptCall = useCallback(async () => {
    const active = callDataRef.current;
    if (!active || !user) return;

    stopRingtoneSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(0); } catch {}
    }

    // Unlock mobile audio element on user gesture
    if (typeof document !== 'undefined') {
      const el = document.getElementById('webchat-remote-audio') as HTMLAudioElement;
      if (el) el.play().catch(() => {});
    }

    setCallState('connecting');

    try {
      // Create WebRTC Answer from the incoming offer
      const answer = await webRTC.createAnswer(active.offerSdp);

      // Dispatch audio-call:accept to server #2
      send<AudioCallAcceptPayload>({
        type: 'audio-call:accept',
        payload: {
          callId: active.callId,
          chatId: active.chatId,
          callerId: active.caller.id,
          receiverId: user.id,
          sdpAnswer: answer,
          answerSdp: answer,
        },
      });

      setCallState('connected');
    } catch (err) {
      console.error('[useCallSignaling] Error accepting call:', err);
      transitionToEnded(0);
      alert('Could not access microphone to accept call.');
    }
  }, [user, webRTC, send, stopRingtoneSound, transitionToEnded]);

  // 3. Reject Incoming Call
  const rejectCall = useCallback(
    (reason: string = 'declined') => {
      const active = callDataRef.current;
      if (!active || !user) return;

      stopRingtoneSound();

      send<AudioCallRejectPayload>({
        type: 'audio-call:reject',
        payload: {
          callId: active.callId,
          chatId: active.chatId,
          callerId: active.caller.id,
          receiverId: user.id,
          reason,
        },
      });

      transitionToEnded(0);
    },
    [user, send, stopRingtoneSound, transitionToEnded]
  );

  // 4. End Call (Caller or Receiver)
  const handleEndCall = useCallback(
    (reason?: string) => {
      const active = callDataRef.current;
      if (!active || !user) return;

      stopRingtoneSound();

      const targetPeerId = active.isCaller ? active.receiver.id : active.caller.id;
      send<AudioCallEndPayload>({
        type: 'audio-call:end',
        payload: {
          callId: active.callId,
          chatId: active.chatId,
          callerId: active.caller.id,
          receiverId: targetPeerId,
          duration: callDuration,
          reason,
        },
      });

      transitionToEnded(800);
    },
    [user, callDuration, send, stopRingtoneSound, transitionToEnded]
  );

  // Subscribe to WebSocket Call Signaling Envelopes
  useEffect(() => {
    // 1. audio-call:incoming
    const unsubIncoming = subscribe<AudioCallIncomingPayload>('audio-call:incoming', (payload) => {
      if (!payload || !user) return;

      // If already in a call, reject as busy
      if (callStateRef.current !== 'idle') {
        send<AudioCallBusyPayload>({
          type: 'audio-call:busy',
          payload: {
            callId: payload.callId,
            chatId: payload.chatId,
            callerId: payload.callerId,
            receiverId: user.id,
          },
        });
        return;
      }

      // Populate call data and ring
      setCallData({
        callId: payload.callId,
        chatId: payload.chatId,
        caller: {
          id: payload.callerId,
          name: payload.callerName,
          avatar: payload.callerAvatar,
        },
        receiver: {
          id: user.id,
          name: user.displayName || `@${user.username}`,
          username: user.username,
          avatar: user.avatarUrl,
        },
        isCaller: false,
        duration: 0,
        offerSdp: payload.sdpOffer || payload.offerSdp,
      });

      setCallState('incoming_ringing');

      // Notify caller that receiver phone is ringing
      send<AudioCallRingPayload>({
        type: 'audio-call:ring',
        payload: {
          callId: payload.callId,
          chatId: payload.chatId,
          callerId: payload.callerId,
          receiverId: user.id,
        },
      });

      // Play ringtone loop & vibrate on mobile devices
      ringtoneStopRef.current = startRingtone();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([400, 250, 400, 250]); } catch {}
      }
    });

    // 2. audio-call:ring — caller receives acknowledgment that peer is ringing
    const unsubRing = subscribe<AudioCallRingPayload>('audio-call:ring', (payload) => {
      if (!payload) return;
      if (callStateRef.current === 'outgoing_calling') {
        setCallState('outgoing_ringing');
      }
    });

    // 3. audio-call:accepted — caller receives answer SDP
    const unsubAccepted = subscribe<AudioCallAcceptedPayload>('audio-call:accepted', async (payload) => {
      if (!payload) return;
      stopRingtoneSound();
      setCallState('connecting');

      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      const answerSdp = payload.sdpAnswer || payload.answerSdp;
      if (answerSdp) {
        await webRTC.setRemoteAnswer(answerSdp);
        setCallState('connected');
      }
    });

    // 4. audio-call:reject — call declined, offline, or timed out
    const unsubReject = subscribe<AudioCallRejectPayload>('audio-call:reject', (payload) => {
      if (!payload) return;
      stopRingtoneSound();
      transitionToEnded(1500);
    });

    // 5. audio-call:busy — recipient is on another call
    const unsubBusy = subscribe<AudioCallBusyPayload>('audio-call:busy', () => {
      stopRingtoneSound();
      alert('User is currently on another call.');
      transitionToEnded(1000);
    });

    // 6. audio-call:ice-candidate — relay ICE candidate to peer connection
    const unsubCandidate = subscribe<AudioCallIceCandidatePayload>('audio-call:ice-candidate', (payload) => {
      if (!payload?.candidate) return;
      webRTC.addIceCandidate(payload.candidate);
    });

    // 7. audio-call:ended — remote peer hung up
    const unsubEnded = subscribe<AudioCallEndedPayload>('audio-call:ended', () => {
      stopRingtoneSound();
      transitionToEnded(800);
    });

    return () => {
      unsubIncoming();
      unsubRing();
      unsubAccepted();
      unsubReject();
      unsubBusy();
      unsubCandidate();
      unsubEnded();
    };
  }, [user, send, subscribe, stopRingtoneSound, transitionToEnded, webRTC]);

  return {
    callState,
    callData,
    callDuration,
    isMuted: webRTC.isMuted,
    isAudioConnected: webRTC.isAudioConnected,
    remoteVolume: webRTC.remoteVolume,
    audioDevices: webRTC.audioDevices,
    selectedOutputDevice: webRTC.selectedOutputDevice,
    startCall,
    acceptCall,
    rejectCall,
    endCall: handleEndCall,
    toggleMute: webRTC.toggleMute,
    switchOutputDevice: webRTC.switchOutputDevice,
  };
}
