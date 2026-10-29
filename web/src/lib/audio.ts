/**
 * Notification Audio Helper for WebChat
 * Safe playback utility with browser autoplay policy handling
 */

export const SOUND_PATHS = {
  sent: '/sounds/sent.mp3',
  receive: '/sounds/receive.mp3',
  ringtone: '/sounds/ringtone.mp3',
} as const;

/**
 * Safely plays an audio file with autoplay exception catching
 * Returns the HTMLAudioElement or null if in SSR or initialization failed
 */
export function playSound(path: string, volume = 0.7): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  try {
    const audio = new Audio(path);
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((_err) => {
        // Swallows mobile browser autoplay policy rejections cleanly
      });
    }
    return audio;
  } catch {
    return null;
  }
}

/**
 * Plays the short pop sound for outgoing sent messages
 */
export const playSentSound = (): HTMLAudioElement | null => playSound(SOUND_PATHS.sent, 0.6);

/**
 * Plays the two-tone chime for incoming received messages
 */
export const playReceiveSound = (): HTMLAudioElement | null => playSound(SOUND_PATHS.receive, 0.8);

/**
 * Starts looping the audio call ringtone.
 * Returns a cleanup function that immediately stops the ringing.
 */
export const startRingtone = (): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  try {
    const audio = new Audio(SOUND_PATHS.ringtone);
    audio.volume = 1.0;
    audio.loop = true;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((_err) => {
        // Autoplay policy prevented immediate playback
      });
    }
    return () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
};

let isAudioUnlocked = false;

/**
 * Phase 40: Silent audio buffer unlock helper
 * Resumes any suspended AudioContext and plays an inaudible 1-millisecond silent buffer
 * on the very first user interaction (touch/click/keydown anywhere on the document).
 */
export function initSilentAudioUnlock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || isAudioUnlocked) {
    return () => {};
  }

  const unlock = () => {
    if (isAudioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        // Play an inaudible 1-sample silent buffer
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
      isAudioUnlocked = true;
    } catch {
      // Swallowed safely
    } finally {
      cleanup();
    }
  };

  const cleanup = () => {
    document.removeEventListener('click', unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  };

  document.addEventListener('click', unlock, { once: true, capture: true });
  document.addEventListener('touchstart', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  return cleanup;
}

/**
 * Phase 40: Play remote call audio with fallback detection
 * If audio.play() is blocked by browser autoplay policy, dispatches 'webchat:autoplay-blocked'
 */
export async function playCallAudioSafely(audioElement: HTMLAudioElement): Promise<boolean> {
  if (!audioElement) return false;
  try {
    await audioElement.play();
    return true;
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'NotSupportedError') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webchat:autoplay-blocked', { detail: { audioElement } }));
      }
    }
    return false;
  }
}
