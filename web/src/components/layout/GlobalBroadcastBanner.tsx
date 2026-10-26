'use client';

import React from 'react';
import { Megaphone, AlertTriangle, AlertOctagon, X } from 'lucide-react';
import { useGlobalBroadcast } from '@/hooks/useGlobalBroadcast';

export default function GlobalBroadcastBanner() {
  const { activeBroadcast, dismissBroadcast } = useGlobalBroadcast();

  if (!activeBroadcast) return null;

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          barClass: 'bg-rose-700 text-white animate-pulse',
          icon: <AlertOctagon className="w-4 h-4 shrink-0 text-white" />,
          badge: 'CRITICAL ALERT',
        };
      case 'WARNING':
        return {
          barClass: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-4 h-4 shrink-0 text-white" />,
          badge: 'SYSTEM WARNING',
        };
      case 'INFO':
      default:
        return {
          barClass: 'bg-[#00a884] text-white',
          icon: <Megaphone className="w-4 h-4 shrink-0 text-white" />,
          badge: 'ANNOUNCEMENT',
        };
    }
  };

  const style = getSeverityStyle(activeBroadcast.severity);

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className={`w-full px-4 py-2.5 z-40 shadow-md transition-all duration-300 ease-out flex items-center justify-between gap-3 ${style.barClass}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1 rounded-md bg-black/15 flex items-center justify-center">
          {style.icon}
        </div>
        <div className="flex items-center gap-2 text-xs truncate">
          <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-black/20">
            {style.badge}
          </span>
          <span className="font-medium text-xs truncate">{activeBroadcast.message}</span>
          {activeBroadcast.creatorName && (
            <span className="text-[10px] opacity-75 hidden sm:inline">
              — {activeBroadcast.creatorName}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => dismissBroadcast(activeBroadcast.id)}
        className="p-1 rounded-md hover:bg-black/20 transition-colors text-white shrink-0"
        aria-label="Dismiss broadcast"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}
