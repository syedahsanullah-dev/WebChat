'use client';

import React from 'react';
import { Lock } from 'lucide-react';

export default function ChannelReadOnlyBar() {
  return (
    <div className="h-16 px-4 bg-wa-light-header/90 dark:bg-[#202c33] border-t border-[#e9edef] dark:border-white/10 flex items-center justify-center gap-2 select-none shadow-xs">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary text-xs font-medium">
        <Lock className="w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
        <span>Only channel administrators can post announcements.</span>
      </div>
    </div>
  );
}
