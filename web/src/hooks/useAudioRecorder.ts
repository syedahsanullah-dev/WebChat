'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { extractWaveformPeaks } from '@/lib/audioUtils';

export interface RecordedAudioResult {
  blob: Blob;
  duration: number;
  peaks: number[];
  mimeType: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveVolume, setLiveVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up all resources
  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setIsLocked(false);
    setLiveVolume(0);
  }, []);

  // Determine best supported MIME type
  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Start recording
  const startRecording = useCallback(async () => {
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Set up real-time volume analyzer
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx) {
        try {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(1, avg / 128);
            setLiveVolume(normalized);
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch {
          // Audio analyzer failure is non-fatal
        }
      }

      mediaRecorder.start(200); // 200ms slices
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      cleanup();
      throw err;
    }
  }, [cleanup]);

  // Lock recording for hands-free mode
  const lockRecording = useCallback(() => {
    setIsLocked(true);
  }, []);

  // Cancel recording and discard data
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    cleanup();
    setRecordingTime(0);
  }, [cleanup]);

  // Stop recording and return audio result
  const stopRecording = useCallback((): Promise<RecordedAudioResult> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup();
        return reject(new Error('MediaRecorder is not active'));
      }

      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const actualDuration = Math.max(1, (Date.now() - startTimeRef.current) / 1000);

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          cleanup();

          // Extract 35 normalized amplitude peaks
          const peaks = await extractWaveformPeaks(blob, 35);

          resolve({
            blob,
            duration: Number(actualDuration.toFixed(1)),
            peaks,
            mimeType,
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      try {
        mediaRecorder.stop();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isLocked,
    recordingTime,
    liveVolume,
    startRecording,
    lockRecording,
    stopRecording,
    cancelRecording,
  };
}
