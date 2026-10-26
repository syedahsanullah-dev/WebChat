'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PendingClockIconProps {
  className?: string;
  size?: number;
}

export default function PendingClockIcon({ className, size = 11 }: PendingClockIconProps) {
  return (
    <span
      title="Waiting for connection (Pending)"
      className={cn('inline-flex items-center text-wa-light-text-muted dark:text-wa-dark-text-muted select-none', className)}
    >
      <Clock style={{ width: size, height: size }} className="opacity-80 animate-pulse" />
    </span>
  );
}
