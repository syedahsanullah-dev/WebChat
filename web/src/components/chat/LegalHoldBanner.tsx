'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalHoldBannerProps {
  className?: string;
}

export default function LegalHoldBanner({ className }: LegalHoldBannerProps) {
  return (
    <div
      className={cn(
        'w-full px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-center gap-2 select-none transition-colors shrink-0',
        className
      )}
      role="alert"
    >
      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="font-medium text-[11px] sm:text-xs text-center">
        <strong>Legal Hold Active:</strong> Message deletion and disappearing timers are suspended for compliance.
      </span>
    </div>
  );
}
