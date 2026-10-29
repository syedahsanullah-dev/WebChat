'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { CallParticipant } from '@/hooks/useCallSignaling';

export interface IncomingCallModalProps {
  isOpen: boolean;
  caller: CallParticipant | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  isOpen,
  caller,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  if (!isOpen || !caller) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm mx-4 bg-wa-light-header dark:bg-wa-dark-header border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative">
        {/* Pulsing Avatar with ringing waves */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-wa-green/30 animate-ping opacity-75" />
          <div className="absolute -inset-4 rounded-full bg-wa-green/20 animate-pulse" />
          <div className="relative ring-4 ring-wa-green rounded-full">
            <Avatar
              name={caller.name}
              src={caller.avatar}
              size="xl"
              className="w-24 h-24 text-2xl"
            />
          </div>
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary truncate max-w-[240px]">
          {caller.name}
        </h3>
        {caller.username && (
          <p className="text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
            @{caller.username}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-wa-green/10 text-xs font-medium text-wa-green">
          <Phone className="w-3.5 h-3.5 animate-bounce" />
          <span>Incoming WebChat Voice Call...</span>
        </div>

        <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted mt-2">
          Direct Encrypted Voice Call (P2P)
        </p>

        {/* Action Buttons: Decline (Red) and Accept (Green) */}
        <div className="mt-8 flex items-center justify-center gap-8 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform focus:outline-none cursor-pointer"
              aria-label="Decline call"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6 fill-current" />
            </button>
            <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Decline
            </span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-wa-green hover:bg-wa-green-hover active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform focus:outline-none cursor-pointer animate-pulse"
              aria-label="Accept call"
              title="Accept"
            >
              <Phone className="w-6 h-6 fill-current" />
            </button>
            <span className="text-xs text-wa-green font-semibold">
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
