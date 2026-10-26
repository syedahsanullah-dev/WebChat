'use client';

import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface WaveformVisualizerProps {
  peaks: number[];
  progress: number; // 0.0 to 1.0
  onSeek?: (progress: number) => void;
  isMe?: boolean;
  interactive?: boolean;
  className?: string;
}

export default function WaveformVisualizer({
  peaks = [],
  progress = 0,
  onSeek,
  isMe = false,
  interactive = true,
  className,
}: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Normalize peaks: minimum 25 bars, default fallback if peaks empty
  const displayPeaks =
    peaks && peaks.length >= 10
      ? peaks
      : [
          0.3, 0.45, 0.6, 0.8, 0.5, 0.35, 0.7, 0.9, 0.65, 0.4, 0.75, 0.85, 0.55, 0.3,
          0.45, 0.7, 0.95, 0.8, 0.6, 0.4, 0.5, 0.75, 0.65, 0.45, 0.35, 0.55, 0.8, 0.6,
          0.45, 0.3,
        ];

  const totalBars = displayPeaks.length;

  const calculateProgressFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const rawProgress = clickX / rect.width;
      return Math.max(0, Math.min(1, rawProgress));
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return;
    isDraggingRef.current = true;
    const newProgress = calculateProgressFromEvent(e);
    onSeek(newProgress);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dragProgress = calculateProgressFromEvent(moveEvent);
      onSeek(dragProgress);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        'relative flex items-center justify-between gap-[1.5px] xs:gap-[2px] h-8 py-1 w-full max-w-full overflow-hidden select-none',
        interactive ? 'cursor-pointer' : 'cursor-default',
        className
      )}
      role="slider"
      aria-label="Audio waveform scrubber"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      {displayPeaks.map((peak, idx) => {
        const barFraction = idx / totalBars;
        const isPlayed = barFraction <= progress;

        // Heights range from 4px to 24px
        const heightPx = Math.max(4, Math.round(peak * 24));

        return (
          <div
            key={idx}
            className="flex-1 min-w-[1.5px] max-w-[3px] flex items-center justify-center h-full relative"
          >
            <div
              className={cn(
                'w-full rounded-full transition-colors duration-75',
                isPlayed
                  ? isMe
                    ? 'bg-wa-green dark:bg-wa-green'
                    : 'bg-wa-blue dark:bg-wa-blue'
                  : 'bg-black/25 dark:bg-white/30'
              )}
              style={{ height: `${heightPx}px` }}
            />
          </div>
        );
      })}

      {/* Scrub dot indicator tracking active progress */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-sm pointer-events-none transition-transform',
          isMe ? 'bg-wa-green' : 'bg-wa-blue'
        )}
        style={{
          left: `${Math.min(100, Math.max(0, progress * 100))}%`,
        }}
      />
    </div>
  );
}
