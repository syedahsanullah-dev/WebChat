'use client';

import React, { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Headphones,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { CallParticipant } from '@/hooks/useCallSignaling';
import { cn } from '@/lib/utils';

export interface ActiveCallBarProps {
  isVisible: boolean;
  participant: CallParticipant | null;
  durationSeconds: number;
  isMuted: boolean;
  remoteVolume: number;
  audioDevices: MediaDeviceInfo[];
  selectedOutputDevice: string;
  onToggleMute: () => void;
  onSwitchOutputDevice: (deviceId: string) => void;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${pad(hrs)}:${pad(remMins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export default function ActiveCallBar({
  isVisible,
  participant,
  durationSeconds,
  isMuted,
  remoteVolume,
  audioDevices,
  selectedOutputDevice,
  onToggleMute,
  onSwitchOutputDevice,
  onEndCall,
}: ActiveCallBarProps) {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  if (!isVisible || !participant) return null;

  const isRemoteSpeaking = remoteVolume > 15;

  return (
    <div className="w-full bg-wa-light-header/95 dark:bg-wa-dark-header/95 backdrop-blur-md border-b border-wa-light-border dark:border-wa-dark-border px-4 py-2.5 flex items-center justify-between shadow-md transition-all z-40 select-none animate-in slide-in-from-top-2 duration-200">
      {/* Left: Participant avatar & Speaking indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar
            name={participant.name}
            src={participant.avatar}
            size="md"
            className={cn(
              'transition-all duration-200',
              isRemoteSpeaking && 'ring-2 ring-wa-green shadow-xs'
            )}
          />
          {/* Audio wave indicator badge */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white ring-2 ring-wa-light-header dark:ring-wa-dark-header transition-colors',
              isRemoteSpeaking ? 'bg-wa-green animate-pulse' : 'bg-gray-400'
            )}
          >
            <Radio className="w-2.5 h-2.5" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {participant.name}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-wa-green/10 text-[10px] font-bold text-wa-green">
              <span>VOICE CALL</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            <span className="font-mono font-medium">{formatDuration(durationSeconds)}</span>
            <span>•</span>
            <span className="text-[11px] text-wa-green">Opus Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right: Audio controls (Mute, Speaker device, End) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 relative">
        {/* Output Device Selector (if multiple audio output devices available) */}
        {audioDevices.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDeviceMenu((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer"
              title="Switch audio output device"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audio Output</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showDeviceMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-wa-light-header dark:bg-wa-dark-header border border-wa-light-border dark:border-wa-dark-border shadow-xl p-1 z-50">
                <div className="px-2 py-1 text-[11px] font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                  Select Output Speaker
                </div>
                {audioDevices.map((device) => {
                  const isSelected =
                    device.deviceId === selectedOutputDevice ||
                    (!selectedOutputDevice && device.deviceId === 'default');
                  return (
                    <button
                      key={device.deviceId}
                      type="button"
                      onClick={() => {
                        onSwitchOutputDevice(device.deviceId);
                        setShowDeviceMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-wa-green/15 text-wa-green font-medium'
                          : 'text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <span className="truncate pr-2">{device.label || 'Default Output Device'}</span>
                      {isSelected && <span className="text-wa-green font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mute Microphone Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none cursor-pointer',
            isMuted
              ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/50 hover:bg-red-500/30'
              : 'bg-black/5 dark:bg-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-black/10 dark:hover:bg-white/15'
          )}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={onEndCall}
          className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all focus:outline-none cursor-pointer"
          aria-label="End call"
          title="End call"
        >
          <PhoneOff className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">End</span>
        </button>
      </div>
    </div>
  );
}
