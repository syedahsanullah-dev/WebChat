'use client';

import { useEffect } from 'react';
import { CallParticipant } from './useCallSignaling';

export interface UseMediaSessionCallProps {
  isActive: boolean;
  participant: CallParticipant | null;
  isMuted: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
}

/**
 * MediaSession API call integration (Phase 40)
 * Exposes call metadata, avatar, hangup, and mute controls to Android
 * lock-screen, notification shade, and bluetooth accessories.
 */
export function useMediaSessionCall({
  isActive,
  participant,
  isMuted,
  onEndCall,
  onToggleMute,
}: UseMediaSessionCallProps) {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (!isActive || !participant) {
      try {
        navigator.mediaSession.metadata = null;
        (navigator.mediaSession.setActionHandler as any)('hangup', null);
        (navigator.mediaSession.setActionHandler as any)('togglemicrophone', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch {}
      return;
    }

    try {
      const artworkSrc = participant.avatar || '/icons/icon-512x512.png';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Voice Call with ${participant.name}`,
        artist: participant.username ? `@${participant.username}` : 'WebChat Voice',
        album: 'WebChat Audio Call',
        artwork: [
          { src: artworkSrc, sizes: '192x192', type: 'image/png' },
          { src: artworkSrc, sizes: '512x512', type: 'image/png' },
        ],
      });

      // Bind media session action handlers (extended W3C call actions & fallback standard actions)
      try {
        (navigator.mediaSession.setActionHandler as any)('hangup', () => {
          onEndCall();
        });
      } catch {}

      try {
        (navigator.mediaSession.setActionHandler as any)('togglemicrophone', () => {
          onToggleMute();
        });
      } catch {}

      try {
        navigator.mediaSession.setActionHandler('stop', () => {
          onEndCall();
        });
      } catch {}

      // Update microphone active status if supported by platform
      if ('setMicrophoneActive' in navigator.mediaSession) {
        (navigator.mediaSession as any).setMicrophoneActive(!isMuted);
      }
    } catch (err) {
      console.warn('[useMediaSessionCall] Failed to configure MediaSession:', err);
    }

    return () => {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = null;
          (navigator.mediaSession.setActionHandler as any)('hangup', null);
          (navigator.mediaSession.setActionHandler as any)('togglemicrophone', null);
          navigator.mediaSession.setActionHandler('stop', null);
        } catch {}
      }
    };
  }, [isActive, participant, isMuted, onEndCall, onToggleMute]);
}
