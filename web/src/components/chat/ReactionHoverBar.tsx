'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export interface ReactionHoverBarProps {
  isVisible: boolean;
  onSelectEmoji: (emoji: string) => void;
  onCustomEmoji?: () => void;
  isMe?: boolean;
  className?: string;
}

export default function ReactionHoverBar({
  isVisible,
  onSelectEmoji,
  onCustomEmoji,
  isMe = false,
  className,
}: ReactionHoverBarProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute -top-10 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-wa-light-header/95 dark:bg-wa-dark-header/95 backdrop-blur-md border border-wa-light-border dark:border-wa-dark-border shadow-lg animate-in fade-in zoom-in-95 duration-100 select-none',
        isMe ? 'right-2' : 'left-2',
        className
      )}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectEmoji(emoji);
          }}
          className="text-base p-1 hover:scale-130 active:scale-95 transition-transform rounded-full focus:outline-none"
        >
          {emoji}
        </button>
      ))}

      {onCustomEmoji && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCustomEmoji();
          }}
          className="p-1 rounded-full text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
          title="More reactions"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
