'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { PhoneOff } from 'lucide-react';
import { CallParticipant, CallState } from '@/hooks/useCallSignaling';

export interface OutgoingCallModalProps {
  isOpen: boolean;
  recipient: CallParticipant | null;
  callState: CallState;
  onEndCall: () => void;
}

export default function OutgoingCallModal({
  isOpen,
  recipient,
  callState,
  onEndCall,
}: OutgoingCallModalProps) {
  if (!isOpen || !recipient) return null;

  const isRinging = callState === 'outgoing_ringing';
  const statusLabel = isRinging ? 'Ringing...' : 'Calling...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm mx-4 bg-wa-light-header dark:bg-wa-dark-header border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative">
        {/* Pulsating Avatar with concentric green ripple rings */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-wa-green/30 animate-ping opacity-75" />
          <div className="absolute -inset-3 rounded-full bg-wa-green/20 animate-pulse" />
          <div className="relative ring-4 ring-wa-green/80 rounded-full">
            <Avatar
              name={recipient.name}
              src={recipient.avatar}
              size="xl"
              className="w-24 h-24 text-2xl"
            />
          </div>
        </div>

        {/* Recipient Details */}
        <h3 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary truncate max-w-[240px]">
          {recipient.name}
        </h3>
        {recipient.username && (
          <p className="text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
            @{recipient.username}
          </p>
        )}

        {/* Call Status Badge */}
        <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-xs font-medium text-wa-green">
          <span className="w-2 h-2 rounded-full bg-wa-green animate-pulse" />
          <span>{statusLabel}</span>
        </div>

        <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted mt-2">
          Direct Encrypted Voice Call (P2P)
        </p>

        {/* Red End Call Action */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform focus:outline-none cursor-pointer"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
