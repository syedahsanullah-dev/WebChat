'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DlpBlockedToastProps {
  message?: string;
  onDismiss: () => void;
}

export default function DlpBlockedToast({
  message = 'Your message was not sent because it contains sensitive data (e.g. credentials, API keys, or financial numbers).',
  onDismiss,
}: DlpBlockedToastProps) {
  return (
    <div className="mx-4 mb-2 p-3 rounded-xl bg-rose-600 text-white shadow-lg flex items-start justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 shrink-0 text-white mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold">Message Blocked by Security Policy</p>
          <p className="opacity-90 mt-0.5">{message}</p>
          <p className="text-[11px] opacity-75 mt-1">
            Your typed text has been preserved below so you can remove the sensitive content.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-md hover:bg-white/20 transition-colors text-white"
        aria-label="Dismiss warning"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
