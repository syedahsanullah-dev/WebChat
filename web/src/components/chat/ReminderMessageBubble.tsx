'use client';

import React from 'react';
import { Clock, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import BotMessageBadge from './BotMessageBadge';

interface ReminderMessageBubbleProps {
  content: string;
  createdAt: string | Date;
  className?: string;
}

export default function ReminderMessageBubble({
  content,
  createdAt,
  className,
}: ReminderMessageBubbleProps) {
  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Clean out leading emoji/formatting if already present
  const cleanContent = content.replace(/^⏰\s*\*\*Reminder(?:\s+for\s+@[^:]+)?\*\*:\s*/i, '');
  const usernameMatch = content.match(/Reminder\s+for\s+(@[a-zA-Z0-9_.-]+)/i);
  const targetUsername = usernameMatch ? usernameMatch[1] : null;

  return (
    <div
      className={cn(
        'w-full max-w-sm mx-auto my-2 p-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 shadow-sm text-wa-light-text-primary dark:text-wa-dark-text-primary select-text transition-all',
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
            Scheduled Reminder
          </span>
        </div>
        <BotMessageBadge size="sm" />
      </div>

      {targetUsername && (
        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
          For {targetUsername}
        </div>
      )}

      <p className="text-xs leading-relaxed whitespace-pre-wrap text-wa-light-text-primary dark:text-wa-dark-text-primary">
        {cleanContent || content}
      </p>

      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-amber-700/70 dark:text-amber-400/60 font-mono">
        <Clock className="w-3 h-3" />
        <span>{timeFormatted}</span>
      </div>
    </div>
  );
}
