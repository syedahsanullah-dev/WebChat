'use client';

import React, { useState } from 'react';
import MessageStatusTick, { MessageStatusType } from './MessageStatusTick';
import QuotedMessageSnippet from './QuotedMessageSnippet';
import ReactionHoverBar from './ReactionHoverBar';
import EmojiReactionPill from './EmojiReactionPill';
import MessageContextMenu from './MessageContextMenu';
import { format } from 'date-fns';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuotedMessageInfo {
  id: string;
  senderName?: string;
  content: string;
}

export interface MessageBubbleProps {
  id: string;
  content: string;
  isMe: boolean;
  status?: MessageStatusType | string;
  createdAt: string | Date;
  replyToId?: string | null;
  replyToMessage?: QuotedMessageInfo | null;
  reactions?: Record<string, string[]> | null;
  isDeleted?: boolean;
  searchQuery?: string;
  currentUserId?: string;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
  onJumpToOriginal?: (targetId: string) => void;
  className?: string;
}

export default function MessageBubble({
  id,
  content,
  isMe,
  status = 'sent',
  createdAt,
  replyToId,
  replyToMessage,
  reactions,
  isDeleted = false,
  searchQuery,
  currentUserId = '',
  onReply,
  onReact,
  onDelete,
  onJumpToOriginal,
  className,
}: MessageBubbleProps) {
  const [showReactionsBar, setShowReactionsBar] = useState(false);

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime()) ? format(dateObj, 'h:mm a') : '';

  const handleCopy = () => {
    if (content && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(content).catch(() => {});
    }
  };

  // Search keyword highlight rendering
  const renderHighlightedContent = (text: string, query?: string) => {
    if (!query || !query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-amber-300 dark:bg-amber-500 text-black rounded-xs px-0.5 font-medium"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      id={`msg-${id}`}
      onMouseEnter={() => setShowReactionsBar(true)}
      onMouseLeave={() => setShowReactionsBar(false)}
      className={cn(
        'flex w-full group relative select-text transition-colors duration-200',
        isMe ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] xl:max-w-[55%] min-w-[70px] px-3 py-1.5 rounded-lg shadow-xs text-sm relative break-words leading-relaxed transition-all',
          isMe
            ? 'bg-wa-light-sent dark:bg-wa-dark-sent text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tr-none'
            : 'bg-wa-light-received dark:bg-wa-dark-received text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tl-none',
          isDeleted && 'italic text-wa-light-text-muted dark:text-wa-dark-text-muted'
        )}
      >
        {/* Floating Quick Reaction Hover Bar */}
        {!isDeleted && onReact && (
          <ReactionHoverBar
            isVisible={showReactionsBar}
            onSelectEmoji={(emoji) => {
              onReact(emoji);
              setShowReactionsBar(false);
            }}
            isMe={isMe}
          />
        )}

        {/* Quoted Reply Snippet */}
        {replyToMessage && !isDeleted && (
          <QuotedMessageSnippet
            authorName={replyToMessage.senderName || 'Reply'}
            content={replyToMessage.content}
            isMe={isMe}
            onClick={() => onJumpToOriginal?.(replyToMessage.id || replyToId || '')}
          />
        )}

        {/* Deleted Message Notice or Normal Content */}
        {isDeleted ? (
          <div className="flex items-center gap-1.5 py-0.5 select-none">
            <Ban className="w-4 h-4 opacity-70" />
            <span>This message was deleted</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{renderHighlightedContent(content, searchQuery)}</div>
        )}

        {/* Timestamp and Delivery Tick */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted float-right ml-3 -mb-0.5 select-none">
          <span>{timeFormatted}</span>
          {isMe && !isDeleted && <MessageStatusTick status={status} />}
        </div>

        {/* Message Context Action Menu */}
        {!isDeleted && (
          <div className="absolute top-1 right-1 z-10">
            <MessageContextMenu
              isMe={isMe}
              onReply={() => onReply?.()}
              onReact={() => setShowReactionsBar(true)}
              onCopy={handleCopy}
              onDelete={() => onDelete?.()}
            />
          </div>
        )}

        {/* Bottom Reaction Pill Badge */}
        {!isDeleted && (
          <EmojiReactionPill
            reactions={reactions}
            currentUserId={currentUserId}
            onToggleReaction={(emoji) => onReact?.(emoji)}
          />
        )}
      </div>
    </div>
  );
}
