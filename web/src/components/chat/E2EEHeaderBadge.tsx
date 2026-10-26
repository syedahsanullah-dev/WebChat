'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface E2EEHeaderBadgeProps {
  onVerifySecurity?: () => void;
  className?: string;
}

export default function E2EEHeaderBadge({
  onVerifySecurity,
  className,
}: E2EEHeaderBadgeProps) {
  return (
    <div className={cn('flex justify-center my-2.5 px-4 select-none', className)}>
      <button
        type="button"
        onClick={onVerifySecurity}
        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#ffeecd]/90 dark:bg-[#182229]/95 text-[#54656f] dark:text-[#8696a0] text-xs shadow-xs text-center max-w-md border border-[#e9edef]/60 dark:border-white/5 hover:bg-[#ffe8b3] dark:hover:bg-[#202c33] transition-all cursor-pointer focus:outline-none"
      >
        <Lock className="w-3.5 h-3.5 text-[#00a884] flex-shrink-0 group-hover:scale-110 transition-transform" />
        <span className="leading-snug">
          Messages and calls are end-to-end encrypted. No one outside of this chat, not even WebChat, can read or listen to them. <span className="underline font-medium text-[#00a884]">Click to verify</span>.
        </span>
      </button>
    </div>
  );
}
