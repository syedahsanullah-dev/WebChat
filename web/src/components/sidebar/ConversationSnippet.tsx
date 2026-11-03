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

function cleanMessageSnippet(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  // Detect undecrypted Base64 AES-GCM ciphertext strings (24+ characters with Base64 chars only)
  if (trimmed.length >= 24 && !trimmed.includes(' ') && /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
    return '🔒 Encrypted message';
  }
  return trimmed;
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

  const displayText = cleanMessageSnippet(lastMessage);

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
      <span className="truncate">{displayText}</span>
    </p>
  );
}
