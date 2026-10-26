'use client';

import React from 'react';
import { X, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuotedMessageData {
  id: string;
  senderName: string;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
}

export interface QuotedReplyPreviewProps {
  replyMessage: QuotedMessageData | null;
  onCancel: () => void;
  className?: string;
}

export default function QuotedReplyPreview({
  replyMessage,
  onCancel,
  className,
}: QuotedReplyPreviewProps) {
  if (!replyMessage) return null;

  const previewSnippet =
    replyMessage.messageType === 'image'
      ? '📷 Photo'
      : replyMessage.messageType === 'voice'
      ? '🎤 Voice message'
      : replyMessage.content;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-wa-light-hover/70 dark:bg-wa-dark-hover/70 border-l-4 border-wa-green select-none animate-in slide-in-from-bottom-2 duration-150',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-4">
        <Reply className="w-4 h-4 text-wa-green flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-wa-green truncate">
            {replyMessage.senderName}
          </p>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
            {previewSnippet}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-full text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none flex-shrink-0"
        aria-label="Cancel reply"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
