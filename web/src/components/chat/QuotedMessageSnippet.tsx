'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface QuotedMessageSnippetProps {
  authorName?: string;
  content: string;
  isMe?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function QuotedMessageSnippet({
  authorName = 'Reply',
  content,
  isMe = false,
  onClick,
  className,
}: QuotedMessageSnippetProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'mb-1.5 p-2 rounded-lg text-xs border-l-4 transition-colors cursor-pointer select-none overflow-hidden max-w-full',
        isMe
          ? 'bg-black/10 dark:bg-black/20 border-wa-green hover:bg-black/15'
          : 'bg-black/5 dark:bg-white/10 border-wa-blue hover:bg-black/10 dark:hover:bg-white/15',
        className
      )}
      role="button"
      tabIndex={0}
      title="Click to jump to quoted message"
    >
      <p
        className={cn(
          'font-semibold truncate mb-0.5',
          isMe ? 'text-wa-green' : 'text-wa-blue'
        )}
      >
        {authorName}
      </p>
      <p className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate leading-tight">
        {content || 'Original message'}
      </p>
    </div>
  );
}
