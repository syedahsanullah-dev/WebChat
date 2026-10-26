'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, Check } from 'lucide-react';

export interface ConnectionToastProps {
  messageCount: number;
  onDismiss: () => void;
}

export default function ConnectionToast({ messageCount, onDismiss }: ConnectionToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#00a884] text-[#111b21] px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2 select-none">
      <div className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0">
        <Check className="w-3.5 h-3.5" />
      </div>
      <span>
        Connected to internet. Synced {messageCount} offline message{messageCount > 1 ? 's' : ''}.
      </span>
    </div>
  );
}
