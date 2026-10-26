'use client';

import React from 'react';
import TypingDots from '@/components/chat/TypingDots';
import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationSnippetProps {
  lastMessage: string;
  isGroup?: boolean;
  isTyping?: boolean;
  typingUsername?: string | null;
  className?: string;
}

export default function ConversationSnippet({
  lastMessage,
  isGroup = false,
  isTyping = false,
  typingUsername,
  className,
}: ConversationSnippetProps) {
  if (isTyping) {
    return (
      <p
        className={cn(
          'text-xs text-wa-green font-medium flex items-center gap-1.5 truncate italic animate-pulse',
          className
        )}
      >
        <span>{typingUsername ? `${typingUsername} is typing` : 'typing...'}</span>
        <TypingDots size="sm" />
      </p>
    );
  }

  return (
    <p
      className={cn(
        'text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate flex items-center gap-1',
        className
      )}
    >
      {!isGroup && (
        <CheckCheck className="w-3.5 h-3.5 text-wa-blue-tick flex-shrink-0" />
      )}
      <span className="truncate">{lastMessage}</span>
    </p>
  );
}
