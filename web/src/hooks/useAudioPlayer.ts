'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export type PlaybackRate = 1 | 1.5 | 2;

export interface UseAudioPlayerOptions {
  src: string;
  initialDuration?: number;
}

export function useAudioPlayer({ src, initialDuration = 0 }: UseAudioPlayerOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [isLoaded, setIsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and bind audio element
  useEffect(() => {
    if (!src) return;

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.preload = 'metadata';

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  // Synchronize playbackRate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Play audio
  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('[useAudioPlayer] Playback was prevented:', err);
        setIsPlaying(false);
      });
  }, []);

  // Pause audio
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Seek to normalized position (0.0 to 1.0)
  const seek = useCallback(
    (targetProgress: number) => {
      if (!audioRef.current) return;
      const effectiveDuration = duration || audioRef.current.duration || 0;
      if (effectiveDuration > 0) {
        const clampedProgress = Math.max(0, Math.min(1, targetProgress));
        const newTime = clampedProgress * effectiveDuration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    },
    [duration]
  );

  // Cycle playback speed: 1x -> 1.5x -> 2x -> 1x
  const changePlaybackRate = useCallback(() => {
    setPlaybackRate((prev) => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  }, []);

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    progress,
    isLoaded,
    play,
    pause,
    togglePlay,
    seek,
    changePlaybackRate,
  };
}
