'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotMessageBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function BotMessageBadge({ className, size = 'sm' }: BotMessageBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-xs uppercase tracking-wider select-none align-middle',
        size === 'sm' ? 'text-[9px] px-1 py-0.2 leading-tight' : 'text-[11px] px-1.5 py-0.5',
        'bg-indigo-600/90 text-white dark:bg-indigo-500/90 dark:text-white shadow-xs',
        className
      )}
      title="Verified Automated Bot / Webhook"
      aria-label="Bot"
    >
      <Bot className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      <span>BOT</span>
    </span>
  );
}
