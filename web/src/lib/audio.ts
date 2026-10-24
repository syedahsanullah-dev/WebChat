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
