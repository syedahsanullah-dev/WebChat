'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { useWebRTC } from './useWebRTC';
import { useScreenWakeLock } from './useScreenWakeLock';
import { useMediaSessionCall } from './useMediaSessionCall';
import { startRingtone } from '@/lib/audio';
import { startTurnStatsTracking } from '@/lib/turnQuotaEstimator';
import { showToast } from '@/components/ui/Toast';
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
  AudioCallAnsweredElsewherePayload,
  AudioCallMutePayload,
  AudioCallIceRestartPayload,
  AudioCallIceRestartAnswerPayload,
} from '@shared/events';

export type CallState =
  | 'idle'
  | 'outgoing_calling'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
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
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);

  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incomingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectGraceTimerRef = useRef<NodeJS.Timeout | null>(null);
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
        if (reconnectGraceTimerRef.current) {
          clearTimeout(reconnectGraceTimerRef.current);
          reconnectGraceTimerRef.current = null;
        }
        setCallState('connected');
      } else if (state === 'disconnected') {
        // Phase 41: Network handover to cellular / Wi-Fi drop -> reconnecting with 10s grace
        if (callStateRef.current === 'connected' || callStateRef.current === 'reconnecting') {
          setCallState('reconnecting');
          if (!reconnectGraceTimerRef.current) {
            reconnectGraceTimerRef.current = setTimeout(() => {
              if (callStateRef.current === 'reconnecting') {
                handleEndCall('connection_lost');
              }
            }, 10000); // 10s grace period
          }

          // Trigger automated ICE restart renegotiation
          const active = callDataRef.current;
          if (active) {
            webRTCRef.current
              .restartIce()
              .then((restartOffer) => {
                const targetPeerId = active.isCaller ? active.receiver.id : active.caller.id;
                send<AudioCallIceRestartPayload>({
                  type: 'audio-call:ice-restart',
                  payload: {
                    callId: active.callId,
                    chatId: active.chatId,
                    callerId: active.caller.id,
                    receiverId: targetPeerId,
                    offerSdp: restartOffer,
                    sdpOffer: restartOffer,
                  },
                });
              })
              .catch((err) => {
                console.warn('[useCallSignaling] ICE restart trigger failed:', err);
              });
          }
        }
      } else if (state === 'failed' || state === 'closed') {
        if (reconnectGraceTimerRef.current) {
          clearTimeout(reconnectGraceTimerRef.current);
          reconnectGraceTimerRef.current = null;
        }
        if (callStateRef.current === 'connected' || callStateRef.current === 'reconnecting') {
          handleEndCall('connection_lost');
        }
      }
    },
  });

  const webRTCRef = useRef(webRTC);
  webRTCRef.current = webRTC;

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
    webRTCRef.current.cleanup();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }
    if (reconnectGraceTimerRef.current) {
      clearTimeout(reconnectGraceTimerRef.current);
      reconnectGraceTimerRef.current = null;
    }
    setIsRemoteMuted(false);

    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setCallData(null);
      setCallDuration(0);
    }, delayMs);
  }, [stopRingtoneSound]);

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
        showToast({ type: 'error', message: 'Could not access microphone. Please grant audio permissions.' });
      }
    },
    [user, webRTC, send, transitionToEnded]
  );

  // 2. Accept Incoming Call
  const acceptCall = useCallback(async () => {
    const active = callDataRef.current;
    if (!active || !user) return;

    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }

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

      // Keep in 'connecting' - wait for ICE connection state to establish 'connected'
    } catch (err) {
      console.error('[useCallSignaling] Error accepting call:', err);
      transitionToEnded(0);
      showToast({ type: 'error', message: 'Could not access microphone to accept call.' });
    }
  }, [user, webRTC, send, stopRingtoneSound, transitionToEnded]);

  // 3. Reject Incoming Call
  const rejectCall = useCallback(
    (reason: string = 'declined') => {
      const active = callDataRef.current;
      if (!active || !user) return;

      if (incomingTimeoutRef.current) {
        clearTimeout(incomingTimeoutRef.current);
        incomingTimeoutRef.current = null;
      }

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

  // Toggle local mute and synchronize state to peer (Phase 39)
  const handleToggleMute = useCallback(() => {
    webRTC.toggleMute();
    const nextMuted = !webRTC.isMuted;
    const active = callDataRef.current;
    if (active && callStateRef.current === 'connected') {
      const targetPeerId = active.isCaller ? active.receiver.id : active.caller.id;
      send<AudioCallMutePayload>({
        type: 'audio-call:mute',
        payload: {
          callId: active.callId,
          chatId: active.chatId,
          userId: user?.id || '',
          isMuted: nextMuted,
        },
      });
    }
  }, [webRTC, send, user]);

  // Phase 40: Screen Wake Lock API (keeps mobile display and CPU active while connected or reconnecting)
  useScreenWakeLock(callState === 'connected' || callState === 'reconnecting');

  // Phase 40: MediaSession API (Android lock screen, notification shade, and headset controls)
  const activeRemotePeer = callData
    ? callData.isCaller
      ? callData.receiver
      : callData.caller
    : null;
  useMediaSessionCall({
    isActive: callState === 'connected' || callState === 'reconnecting',
    participant: activeRemotePeer,
    isMuted: webRTC.isMuted,
    onEndCall: handleEndCall,
    onToggleMute: handleToggleMute,
  });

  // Phase 41: Client-Side TURN bandwidth telemetry against Metered.ca 50 GB/mo limit
  useEffect(() => {
    if (callState === 'connected') {
      const pc = webRTC.getPeerConnection();
      if (pc) {
        const stopTracking = startTurnStatsTracking(pc, 5000);
        return stopTracking;
      }
    }
  }, [callState, webRTC]);

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

      // 45s incoming ringing timeout (Phase 39)
      if (incomingTimeoutRef.current) {
        clearTimeout(incomingTimeoutRef.current);
      }
      incomingTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'incoming_ringing') {
          rejectCall('timeout');
        }
      }, 45000);

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
        await webRTCRef.current.setRemoteAnswer(answerSdp);
        // Connection state listener handles transition to 'connected' when ICE completes
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
      showToast({ type: 'info', message: 'Contact is currently busy on another call.' });
      transitionToEnded(1000);
    });

    // 6. audio-call:ice-candidate — relay ICE candidate to peer connection
    const unsubCandidate = subscribe<AudioCallIceCandidatePayload>('audio-call:ice-candidate', (payload) => {
      if (!payload?.candidate) return;
      webRTCRef.current.addIceCandidate(payload.candidate);
    });

    // 7. audio-call:ended — remote peer hung up
    const unsubEnded = subscribe<AudioCallEndedPayload>('audio-call:ended', () => {
      stopRingtoneSound();
      transitionToEnded(800);
    });

    // 8. audio-call:answered_elsewhere — call answered on another tab/device (Phase 39)
    const unsubAnsweredElsewhere = subscribe<AudioCallAnsweredElsewherePayload>(
      'audio-call:answered_elsewhere',
      (payload) => {
        if (!payload) return;
        const active = callDataRef.current;
        if (active && active.callId === payload.callId) {
          stopRingtoneSound();
          transitionToEnded(0);
        }
      }
    );

    // 9. audio-call:mute — peer muted or unmuted mic (Phase 39)
    const unsubMute = subscribe<AudioCallMutePayload>('audio-call:mute', (payload) => {
      if (!payload) return;
      const active = callDataRef.current;
      if (active && active.callId === payload.callId) {
        setIsRemoteMuted(Boolean(payload.isMuted));
      }
    });

    // 10. audio-call:ice-restart — peer initiated renegotiation for network handover (Phase 41)
    const unsubIceRestart = subscribe<AudioCallIceRestartPayload>('audio-call:ice-restart', async (payload) => {
      if (!payload || !user) return;
      const active = callDataRef.current;
      if (active && active.callId === payload.callId) {
        try {
          setCallState('reconnecting');
          const offerSdp = payload.offerSdp || payload.sdpOffer;
          const answer = await webRTCRef.current.createAnswer(offerSdp);
          const targetPeerId = active.isCaller ? active.receiver.id : active.caller.id;
          send<AudioCallIceRestartAnswerPayload>({
            type: 'audio-call:ice-restart-answer',
            payload: {
              callId: active.callId,
              chatId: active.chatId,
              callerId: active.caller.id,
              receiverId: targetPeerId,
              answerSdp: answer,
              sdpAnswer: answer,
            },
          });
        } catch (err) {
          console.warn('[useCallSignaling] Failed to answer ICE restart:', err);
        }
      }
    });

    // 11. audio-call:ice-restart-answer — peer acknowledged ICE restart with answer (Phase 41)
    const unsubIceRestartAnswer = subscribe<AudioCallIceRestartAnswerPayload>(
      'audio-call:ice-restart-answer',
      async (payload) => {
        if (!payload) return;
        const active = callDataRef.current;
        if (active && active.callId === payload.callId) {
          try {
            const answerSdp = payload.answerSdp || payload.sdpAnswer;
            if (answerSdp) {
              await webRTCRef.current.setRemoteAnswer(answerSdp);
              if (reconnectGraceTimerRef.current) {
                clearTimeout(reconnectGraceTimerRef.current);
                reconnectGraceTimerRef.current = null;
              }
              setCallState('connected');
            }
          } catch (err) {
            console.warn('[useCallSignaling] Failed to apply ICE restart answer:', err);
          }
        }
      }
    );

    return () => {
      unsubIncoming();
      unsubRing();
      unsubAccepted();
      unsubReject();
      unsubBusy();
      unsubCandidate();
      unsubEnded();
      unsubAnsweredElsewhere();
      unsubMute();
      unsubIceRestart();
      unsubIceRestartAnswer();
    };
  }, [user, send, subscribe, stopRingtoneSound, transitionToEnded]);

  return {
    callState,
    callData,
    callDuration,
    isMuted: webRTC.isMuted,
    isRemoteMuted,
    isAudioConnected: webRTC.isAudioConnected,
    remoteVolume: webRTC.remoteVolume,
    audioDevices: webRTC.audioDevices,
    selectedOutputDevice: webRTC.selectedOutputDevice,
    startCall,
    acceptCall,
    rejectCall,
    endCall: handleEndCall,
    toggleMute: handleToggleMute,
    switchOutputDevice: webRTC.switchOutputDevice,
  };
}
