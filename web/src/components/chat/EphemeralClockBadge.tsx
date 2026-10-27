'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EphemeralClockBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
}

export default function EphemeralClockBadge({
  size = 'sm',
  className,
  title = 'Disappearing messages on',
}: EphemeralClockBadgeProps) {
  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center text-wa-light-text-secondary dark:text-wa-dark-text-secondary select-none shrink-0',
        className
      )}
      title={title}
      aria-label={title}
    >
      <Clock className={sizeClasses} />
    </span>
  );
}
