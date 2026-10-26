'use client';

import React from 'react';
import { Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface CallLogBadgeProps {
  id?: string;
  content: string;
  createdAt: string | Date;
  className?: string;
}

export default function CallLogBadge({
  id,
  content,
  createdAt,
  className,
}: CallLogBadgeProps) {
  const isMissed = content.toLowerCase().includes('missed');
  const isDeclined = content.toLowerCase().includes('declined') || content.toLowerCase().includes('busy');
  const isCompleted = content.toLowerCase().includes('voice call -');

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime()) ? format(dateObj, 'h:mm a') : '';

  // Clean label without the leading emoji if present
  const cleanContent = content.replace(/^📞\s*/, '');

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
            : isDeclined
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-wa-light-header/90 dark:bg-wa-dark-header/90 text-wa-light-text-primary dark:text-wa-dark-text-primary border border-black/5 dark:border-white/5'
        )}
      >
        {isMissed ? (
          <PhoneMissed className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        ) : isDeclined ? (
          <PhoneOff className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        ) : (
          <Phone className="w-3.5 h-3.5 text-wa-green flex-shrink-0 fill-current" />
        )}

        <span className="font-medium">{cleanContent}</span>

        {timeFormatted && (
          <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted ml-1 opacity-80">
            {timeFormatted}
          </span>
        )}
      </div>
    </div>
  );
}
