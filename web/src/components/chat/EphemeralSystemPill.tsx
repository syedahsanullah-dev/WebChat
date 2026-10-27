'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EphemeralSystemPillProps {
  content: string;
  onClick?: () => void;
  className?: string;
}

export default function EphemeralSystemPill({
  content,
  onClick,
  className,
}: EphemeralSystemPillProps) {
  return (
    <div className={cn('flex justify-center my-2 select-none', className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-colors',
          'bg-wa-light-received/90 dark:bg-[#182229]/90 border border-black/5 dark:border-white/5',
          'text-wa-light-text-secondary dark:text-wa-dark-text-secondary',
          onClick && 'hover:bg-black/10 dark:hover:bg-[#202c33] cursor-pointer'
        )}
      >
        <Clock className="w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted shrink-0" />
        <span>{content}</span>
      </button>
    </div>
  );
}
