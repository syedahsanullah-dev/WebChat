'use client';

import React, { useState } from 'react';
import MessageStatusTick, { MessageStatusType } from './MessageStatusTick';
import QuotedMessageSnippet from './QuotedMessageSnippet';
import ReactionHoverBar from './ReactionHoverBar';
import EmojiReactionPill from './EmojiReactionPill';
import MessageContextMenu from './MessageContextMenu';
import { format } from 'date-fns';
import { Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuotedMessageInfo } from './MessageBubble';

export interface ImageBubbleProps {
  id: string;
  mediaUrl: string;
  caption?: string | null;
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
  onOpenLightbox?: (src: string, caption?: string | null) => void;
  className?: string;
}

export default function ImageBubble({
  id,
  mediaUrl,
  caption,
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
  onOpenLightbox,
  className,
}: ImageBubbleProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime())
    ? format(dateObj, 'h:mm a')
    : '';

  const handleCopyCaption = () => {
    if (caption && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(caption).catch(() => {});
    }
  };

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

  if (isDeleted) {
    return (
      <div
        id={`msg-${id}`}
        className={cn(
          'flex w-full group relative select-text transition-colors duration-200',
          isMe ? 'justify-end' : 'justify-start',
          className
        )}
      >
        <div
          className={cn(
            'max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg shadow-xs text-sm relative break-words leading-relaxed transition-all italic text-wa-light-text-muted dark:text-wa-dark-text-muted',
            isMe
              ? 'bg-wa-light-sent dark:bg-wa-dark-sent rounded-tr-none'
              : 'bg-wa-light-received dark:bg-wa-dark-received rounded-tl-none'
          )}
        >
          <div className="flex items-center gap-1.5 py-0.5 select-none">
            <Ban className="w-4 h-4 opacity-70" />
            <span>This message was deleted</span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted float-right ml-3 -mb-0.5 select-none">
            <span>{timeFormatted}</span>
          </div>
        </div>
      </div>
    );
  }

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
          'max-w-[85%] sm:max-w-[60%] md:max-w-[450px] p-1 rounded-xl shadow-xs text-sm relative overflow-visible transition-all',
          isMe
            ? 'bg-wa-light-sent dark:bg-wa-dark-sent text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tr-none'
            : 'bg-wa-light-received dark:bg-wa-dark-received text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tl-none'
        )}
      >
        {/* Floating Quick Reaction Hover Bar */}
        {onReact && (
          <ReactionHoverBar
            isVisible={showReactionsBar}
            onSelectEmoji={(emoji) => {
              onReact(emoji);
              setShowReactionsBar(false);
            }}
            isMe={isMe}
          />
        )}

        {/* Quoted Message Snippet */}
        {replyToMessage && (
          <div className="p-1 pb-1.5">
            <QuotedMessageSnippet
              authorName={replyToMessage.senderName || 'Reply'}
              content={replyToMessage.content}
              isMe={isMe}
              onClick={() => onJumpToOriginal?.(replyToMessage.id || replyToId || '')}
            />
          </div>
        )}

        {/* Image Container */}
        <div
          onClick={() => onOpenLightbox?.(mediaUrl, caption)}
          className="relative rounded-lg overflow-hidden cursor-pointer bg-black/5 dark:bg-white/5 aspect-4/3 max-h-[350px] flex items-center justify-center group/img"
        >
          {/* Skeleton loader while image loads */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-white/10 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-wa-green opacity-60" />
            </div>
          )}

          {/* Actual Image */}
          <img
            src={mediaUrl}
            alt={caption || 'Shared photo'}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              'w-full h-full object-cover rounded-lg group-hover/img:scale-102 transition-transform duration-200',
              !isLoaded && 'opacity-0'
            )}
          />

          {/* Dark gradient overlay with time and tick when there is no caption */}
          {!caption && (
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-end gap-1 text-[10px] text-white select-none">
              <span>{timeFormatted}</span>
              {isMe && <MessageStatusTick status={status} className="text-white" />}
            </div>
          )}
        </div>

        {/* Caption text below image */}
        {caption && (
          <div className="px-2 pt-1.5 pb-1 flex items-end justify-between gap-3">
            <p className="whitespace-pre-wrap leading-relaxed text-sm">
              {renderHighlightedContent(caption, searchQuery)}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted select-none flex-shrink-0">
              <span>{timeFormatted}</span>
              {isMe && <MessageStatusTick status={status} />}
            </div>
          </div>
        )}

        {/* Message Context Action Menu */}
        <div className="absolute top-2 right-2 z-10">
          <MessageContextMenu
            isMe={isMe}
            onReply={() => onReply?.()}
            onReact={() => setShowReactionsBar(true)}
            onCopy={caption ? handleCopyCaption : undefined}
            onDelete={() => onDelete?.()}
          />
        </div>

        {/* Bottom Reaction Pill Badge */}
        <EmojiReactionPill
          reactions={reactions}
          currentUserId={currentUserId}
          onToggleReaction={(emoji) => onReact?.(emoji)}
          className={isMe ? 'right-2' : 'left-2'}
        />
      </div>
    </div>
  );
}
