'use client';

import React from 'react';
import { Laptop, Smartphone, Tablet, Globe, LogOut, CheckCircle2 } from 'lucide-react';
import { formatLastSeen } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';

export interface DeviceSessionItem {
  id: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN' | string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface DeviceCardProps {
  session: DeviceSessionItem;
  onRevoke?: (session: DeviceSessionItem) => void;
  className?: string;
}

export default function DeviceCard({ session, onRevoke, className }: DeviceCardProps) {
  const getDeviceIcon = () => {
    switch (session.deviceType) {
      case 'MOBILE':
        return <Smartphone className="w-5 h-5 text-wa-green" />;
      case 'TABLET':
        return <Tablet className="w-5 h-5 text-wa-green" />;
      case 'DESKTOP':
        return <Laptop className="w-5 h-5 text-wa-green" />;
      default:
        return <Globe className="w-5 h-5 text-wa-green" />;
    }
  };

  const formattedLastActive = session.isCurrent
    ? 'Active now'
    : formatLastSeen(session.lastActiveAt) || 'Recently active';

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl border transition-colors',
        session.isCurrent
          ? 'bg-wa-green/5 border-wa-green/30'
          : 'bg-wa-light-input dark:bg-wa-dark-input border-wa-light-border dark:border-wa-dark-border',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-full bg-wa-green/10 flex items-center justify-center flex-shrink-0">
          {getDeviceIcon()}
        </div>

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {session.browser} on {session.os}
            </span>
            {session.isCurrent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-wa-green text-white">
                <CheckCircle2 className="w-3 h-3" />
                <span>This device</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
            <span className={cn(session.isCurrent ? 'text-wa-green font-medium' : '')}>
              {formattedLastActive}
            </span>
            <span>•</span>
            <span className="font-mono text-[11px] opacity-75">{session.ipAddress}</span>
          </div>
        </div>
      </div>

      {!session.isCurrent && onRevoke && (
        <button
          type="button"
          onClick={() => onRevoke(session)}
          className="p-2 rounded-lg text-wa-light-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors focus:outline-none cursor-pointer flex-shrink-0 ml-2"
          aria-label={`Log out ${session.browser} on ${session.os}`}
          title="Log out remote session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
