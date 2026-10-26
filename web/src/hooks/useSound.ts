'use client';

import { useCallback } from 'react';
import { playSentSound, playReceiveSound, startRingtone } from '@/lib/audio';

export function useSound() {
  const playSent = useCallback(() => {
    playSentSound();
  }, []);

  const playReceive = useCallback(() => {
    playReceiveSound();
  }, []);

  const playRing = useCallback(() => {
    return startRingtone();
  }, []);

  return {
    playSent,
    playReceive,
    playRing,
  };
}
