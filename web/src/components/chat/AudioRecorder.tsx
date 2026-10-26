'use client';

import React from 'react';
import { Trash2, Send, Lock, LockOpen } from 'lucide-react';
import { formatDuration } from '@/lib/audioUtils';
import { cn } from '@/lib/utils';

export interface AudioRecorderProps {
  isRecording: boolean;
  isLocked: boolean;
  recordingTime: number;
  liveVolume: number;
  isProcessing?: boolean;
  onCancel: () => void;
  onLock: () => void;
  onSend: () => void;
  className?: string;
}

export default function AudioRecorder({
  isRecording,
  isLocked,
  recordingTime,
  liveVolume,
  isProcessing = false,
  onCancel,
  onLock,
  onSend,
  className,
}: AudioRecorderProps) {
  if (!isRecording) return null;

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-3 px-3 py-1.5 bg-wa-light-header dark:bg-wa-dark-header rounded-xl select-none animate-in fade-in slide-in-from-bottom-2 duration-150',
        className
      )}
    >
      {/* Cancel / Trash Button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        className="p-2 rounded-full text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors focus:outline-none flex-shrink-0"
        aria-label="Cancel recording"
        title="Discard recording"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Recording indicator & timer */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Pulsating red recording dot */}
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </div>

        <span className="text-sm font-mono font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
          {formatDuration(recordingTime)}
        </span>

        {/* Live animated waveform visualizer reacting to mic volume */}
        <div className="flex-1 flex items-center gap-[3px] h-6 px-2 overflow-hidden">
          {[0.2, 0.4, 0.7, 0.9, 0.5, 0.3, 0.8, 0.6, 0.4, 0.7, 0.3, 0.6, 0.8, 0.5, 0.2].map(
            (baseHeight, i) => {
              // Modulate height based on real-time live volume
              const scale = 0.3 + liveVolume * 0.7;
              const dynamicHeight = Math.max(
                4,
                Math.round(baseHeight * scale * 24 * (0.8 + 0.4 * Math.sin(i + recordingTime * 2)))
              );
              return (
                <div
                  key={i}
                  className="w-[2.5px] rounded-full bg-wa-green transition-all duration-75"
                  style={{ height: `${dynamicHeight}px` }}
                />
              );
            }
          )}
        </div>
      </div>

      {/* Actions: Lock & Send */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Hands-free Lock toggle */}
        <button
          type="button"
          onClick={onLock}
          disabled={isProcessing || isLocked}
          className={cn(
            'p-2 rounded-full transition-colors focus:outline-none',
            isLocked
              ? 'text-wa-green bg-wa-green/10'
              : 'text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          )}
          title={isLocked ? 'Hands-free recording locked' : 'Lock for hands-free recording'}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
        </button>

        {/* Send voice note button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isProcessing}
          className="p-2 rounded-full bg-wa-green text-white hover:bg-wa-green-dark transition-all focus:outline-none shadow-xs hover:scale-105 active:scale-95 disabled:opacity-50"
          aria-label="Send voice message"
          title="Send voice note"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
