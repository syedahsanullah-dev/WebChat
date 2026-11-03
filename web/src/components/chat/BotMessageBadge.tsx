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
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-wa-green/10 text-wa-green text-[10px] font-bold tracking-wider select-none',
        className
      )}
    >
      <Bot className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>BOT</span>
    </span>
  );
}
