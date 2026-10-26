'use client';

import React from 'react';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MessageStatusType = 'pending' | 'sent' | 'delivered' | 'read';

interface MessageStatusTickProps {
  status: MessageStatusType | string;
  className?: string;
}

export default function MessageStatusTick({ status, className }: MessageStatusTickProps) {
  const normalizedStatus = String(status).toLowerCase();

  switch (normalizedStatus) {
    case 'pending':
    case 'clock':
      return (
        <Clock
          className={cn('w-3 h-3 text-wa-light-text-muted dark:text-wa-dark-text-muted animate-spin-slow', className)}
          aria-label="Pending (sending)"
        />
      );

    case 'sent':
      return (
        <Check
          className={cn('w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted', className)}
          aria-label="Sent (single tick)"
        />
      );

    case 'delivered':
      return (
        <CheckCheck
          className={cn('w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted', className)}
          aria-label="Delivered (double grey tick)"
        />
      );

    case 'read':
      return (
        <CheckCheck
          className={cn('w-3.5 h-3.5 text-wa-blue-tick', className)}
          aria-label="Read (double blue tick)"
        />
      );

    default:
      return null;
  }
}
