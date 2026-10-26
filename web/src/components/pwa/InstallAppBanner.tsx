'use client';

import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Smartphone, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InstallAppBannerProps {
  className?: string;
}

export default function InstallAppBanner({ className }: InstallAppBannerProps) {
  const { isInstallable, installApp, dismissInstall } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <aside
      aria-label="Install WebChat"
      className={cn(
        'w-full bg-wa-green/10 dark:bg-wa-green/15 border-b border-wa-green/20 px-3.5 py-2.5 flex items-center justify-between gap-3 text-sm animate-in slide-in-from-top duration-300 select-none z-30',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-wa-green/20 text-wa-green flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-xs sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
            Install WebChat App
          </p>
          <p className="text-[11px] sm:text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
            Add to home screen for faster access & instant notifications
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={installApp}
          className="px-3 py-1.5 rounded-full bg-wa-green hover:bg-wa-green-hover text-[#111b21] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 focus:outline-none cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Install</span>
        </button>

        <button
          type="button"
          onClick={dismissInstall}
          className="w-7 h-7 rounded-full flex items-center justify-center text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
          aria-label="Dismiss install banner"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
