'use client';

import React from 'react';
import { Phone, PhoneOff, PhoneMissed } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type CallStatus = 'completed' | 'missed' | 'rejected' | 'busy';

export interface CallLogBadgeProps {
  id?: string;
  content?: string;
  status?: CallStatus;
  duration?: number;
  createdAt: string | Date;
  className?: string;
}

function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function CallLogBadge({
  id,
  content = '',
  status: explicitStatus,
  duration,
  createdAt,
  className,
}: CallLogBadgeProps) {
  const rawContent = (content || '').trim();
  const lower = rawContent.toLowerCase();

  // Deduce status either from explicit prop or content string
  let resolvedStatus: CallStatus = 'completed';
  if (explicitStatus) {
    resolvedStatus = explicitStatus;
  } else if (lower.includes('missed')) {
    resolvedStatus = 'missed';
  } else if (lower.includes('declined') || lower.includes('rejected')) {
    resolvedStatus = 'rejected';
  } else if (lower.includes('busy') || lower.includes('contact busy')) {
    resolvedStatus = 'busy';
  } else {
    resolvedStatus = 'completed';
  }

  // Determine display label
  let displayLabel = rawContent.replace(/^📞\s*/, '');
  if (!displayLabel || explicitStatus) {
    switch (resolvedStatus) {
      case 'missed':
        displayLabel = 'Missed voice call';
        break;
      case 'rejected':
        displayLabel = 'Declined voice call';
        break;
      case 'busy':
        displayLabel = 'Contact busy';
        break;
      case 'completed':
      default:
        displayLabel =
          typeof duration === 'number' && duration > 0
            ? `Voice call - ${formatCallDuration(duration)}`
            : displayLabel || 'Voice call';
        break;
    }
  }

  const isMissed = resolvedStatus === 'missed';
  const isDeclinedOrBusy = resolvedStatus === 'rejected' || resolvedStatus === 'busy';

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted =
    dateObj && !isNaN(dateObj.getTime()) ? format(dateObj, 'h:mm a') : '';

  return (
    <div
      id={id ? `msg-${id}` : undefined}
      className={cn('flex justify-center my-2 select-none w-full', className)}
    >
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shadow-xs text-center max-w-sm transition-all',
          isMissed
            ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20'
            : isDeclinedOrBusy
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-wa-light-header/90 dark:bg-wa-dark-header/90 text-wa-light-text-primary dark:text-wa-dark-text-primary border border-black/5 dark:border-white/5'
        )}
      >
        {isMissed ? (
          <PhoneMissed className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        ) : isDeclinedOrBusy ? (
          <PhoneOff className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        ) : (
          <Phone className="w-3.5 h-3.5 text-wa-green flex-shrink-0 fill-current" />
        )}

        <span className="font-medium">{displayLabel}</span>

        {timeFormatted && (
          <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted ml-1 opacity-80">
            {timeFormatted}
          </span>
        )}
      </div>
    </div>
  );
}
