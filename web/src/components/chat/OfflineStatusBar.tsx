'use client';

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface OfflineStatusBarProps {
  className?: string;
}

export default function OfflineStatusBar({ className }: OfflineStatusBarProps) {
  const { isOnline, isSocketConnected, isReconnecting } = useNetworkStatus();

  // If online and socket connected, don't show the warning bar
  if (isOnline && isSocketConnected) {
    return null;
  }

  const isNetworkOffline = !isOnline;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#f59e0b] dark:bg-[#d97706] text-[#111b21] px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium shadow-sm transition-all duration-300 animate-in slide-in-from-top-1 select-none z-20"
    >
      {isNetworkOffline ? (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>Computer not connected. Make sure you have an active Internet connection.</span>
        </>
      ) : isReconnecting ? (
        <>
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>Connecting to WhatsApp Web...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Waiting for network... Messages will be queued and sent automatically.</span>
        </>
      )}
    </div>
  );
}
