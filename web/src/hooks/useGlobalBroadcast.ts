'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { SystemBroadcastPayload, SystemBroadcastDismissPayload } from '@shared/events';

export interface ActiveBroadcast {
  id: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt?: string;
  expiresAt?: string | null;
  creatorName?: string;
}

/**
 * Plays subtle dual-tone chime (520Hz ➔ 660Hz) using the Web Audio API
 * Zero asset dependencies, $0 cost.
 */
export function playBroadcastAlertChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency ramp: 520Hz -> 660Hz
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);

    // Gain envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Non-fatal if audio context blocked by browser autoplay policy
  }
}

export function useGlobalBroadcast() {
  const { subscribe } = useWebSocket();
  const [activeBroadcast, setActiveBroadcast] = useState<ActiveBroadcast | null>(null);

  // Check if broadcast was dismissed in this browser session
  const isDismissed = (id: string): boolean => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(`dismissed_bcast_${id}`) === 'true';
  };

  // Initial load of active broadcast
  useEffect(() => {
    let isSubscribed = true;

    async function loadActiveBroadcast() {
      try {
        const res = await fetch('/api/broadcasts/active');
        if (res.ok) {
          const data = await res.json();
          if (data.broadcast && isSubscribed) {
            if (!isDismissed(data.broadcast.id)) {
              setActiveBroadcast(data.broadcast);
            }
          }
        }
      } catch {
        // Silently ignore if offline
      }
    }

    loadActiveBroadcast();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Real-time WebSocket listener
  useEffect(() => {
    // 1. New or updated broadcast arrives in real-time (< 50ms)
    const unsubBroadcast = subscribe<SystemBroadcastPayload>('system:broadcast', (payload) => {
      if (!payload || !payload.id || !payload.message) return;

      setActiveBroadcast(payload);
      // Play alert chime when incoming broadcast received
      playBroadcastAlertChime();
    });

    // 2. Broadcast dismissed / deactivated by admin
    const unsubDismiss = subscribe<SystemBroadcastDismissPayload>(
      'system:broadcast_dismiss',
      (payload) => {
        if (!payload || !payload.id) return;

        setActiveBroadcast((current) => {
          if (current?.id === payload.id) {
            return null;
          }
          return current;
        });
      }
    );

    return () => {
      unsubBroadcast();
      unsubDismiss();
    };
  }, [subscribe]);

  const dismissBroadcast = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`dismissed_bcast_${id}`, 'true');
    }
    setActiveBroadcast(null);
  }, []);

  return {
    activeBroadcast,
    dismissBroadcast,
  };
}
