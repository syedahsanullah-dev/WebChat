'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface EmojiReactionPillProps {
  reactions?: Record<string, string[]> | null; // emoji -> userIds
  currentUserId: string;
  onToggleReaction?: (emoji: string) => void;
  className?: string;
}

export default function EmojiReactionPill({
  reactions,
  currentUserId,
  onToggleReaction,
  className,
}: EmojiReactionPillProps) {
  if (!reactions) return null;

  const entries = Object.entries(reactions).filter(([, userIds]) => userIds && userIds.length > 0);
  if (entries.length === 0) return null;

  const totalCount = entries.reduce((acc, [, userIds]) => acc + userIds.length, 0);

  return (
    <div
      className={cn(
        'absolute -bottom-3 right-3 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-wa-light-header dark:bg-wa-dark-header border border-wa-light-border dark:border-wa-dark-border shadow-xs text-xs select-none cursor-pointer hover:scale-105 transition-transform',
        className
      )}
    >
      <div className="flex items-center -space-x-1">
        {entries.slice(0, 3).map(([emoji]) => (
          <span key={emoji} className="text-xs">
            {emoji}
          </span>
        ))}
      </div>
      {totalCount > 1 && (
        <span className="text-[10px] font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary pl-0.5">
          {totalCount}
        </span>
      )}
    </div>
  );
}
