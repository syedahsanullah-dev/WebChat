'use client';

import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateDividerProps {
  date: Date | string;
  className?: string;
}

export function formatDateDivider(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'MMMM d, yyyy');
}

export default function DateDivider({ date, className }: DateDividerProps) {
  const text = formatDateDivider(date);
  if (!text) return null;

  return (
    <div className={cn('flex justify-center my-3 select-none pointer-events-none', className)}>
      <span className="px-3 py-1 rounded-lg text-xs font-medium bg-wa-light-header/90 dark:bg-wa-dark-header/90 text-wa-light-text-secondary dark:text-wa-dark-text-secondary shadow-xs uppercase tracking-wide">
        {text}
      </span>
    </div>
  );
}
