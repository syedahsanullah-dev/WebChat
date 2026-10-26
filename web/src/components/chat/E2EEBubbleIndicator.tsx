'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface E2EEBubbleIndicatorProps {
  className?: string;
}

export default function E2EEBubbleIndicator({ className }: E2EEBubbleIndicatorProps) {
  return (
    <span
      title="End-to-end encrypted message"
      className={cn(
        'inline-flex items-center text-wa-light-text-muted dark:text-wa-dark-text-muted select-none mr-0.5',
        className
      )}
    >
      <Lock className="w-2.5 h-2.5 opacity-80" strokeWidth={2.5} />
    </span>
  );
}
