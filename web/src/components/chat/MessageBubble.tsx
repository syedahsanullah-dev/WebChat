'use client';

import React, { useState } from 'react';
import MessageStatusTick, { MessageStatusType } from './MessageStatusTick';
import E2EEBubbleIndicator from './E2EEBubbleIndicator';
import QuotedMessageSnippet from './QuotedMessageSnippet';
import ReactionHoverBar from './ReactionHoverBar';
import EmojiReactionPill from './EmojiReactionPill';
import MessageContextMenu from './MessageContextMenu';
import BotMessageBadge from './BotMessageBadge';
import ReminderMessageBubble from './ReminderMessageBubble';
import PinDurationModal from './PinDurationModal';
import ReportMessageModal from './ReportMessageModal';
import MessageTextRenderer from './MessageTextRenderer';
import EphemeralClockBadge from './EphemeralClockBadge';
import { format } from 'date-fns';
import { Ban, Star } from 'lucide-react';
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
  messageType?: string;
  authorName?: string;
  replyToId?: string | null;
  replyToMessage?: QuotedMessageInfo | null;
  reactions?: Record<string, string[]> | null;
  isDeleted?: boolean;
  isE2EE?: boolean;
  isStarred?: boolean;
  expiresAt?: string | Date | null;
  senderId?: string;
  chatId?: string;
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
  messageType,
  authorName,
  replyToId,
  replyToMessage,
  reactions,
  isDeleted = false,
  isE2EE = false,
  isStarred = false,
  expiresAt,
  senderId,
  chatId,
  searchQuery,
  currentUserId = '',
  onReply,
  onReact,
  onDelete,
  onJumpToOriginal,
  className,
}: MessageBubbleProps) {
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStarredState, setIsStarredState] = useState(isStarred);

  const handleToggleStar = async () => {
    const nextState = !isStarredState;
    setIsStarredState(nextState);
    try {
      await fetch(`/api/messages/${id}/star`, {
        method: nextState ? 'POST' : 'DELETE',
      });
    } catch (err) {
      console.error('Failed to toggle star:', err);
      setIsStarredState(!nextState);
    }
  };

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime()) ? format(dateObj, 'h:mm a') : '';

  // If this is a scheduled reminder system bot message, render specialized reminder card
  if (messageType === 'system_bot' && (content.startsWith('⏰') || content.includes('Reminder for @'))) {
    return (
      <div id={`msg-${id}`} className={cn('flex w-full justify-center my-1', className)}>
        <ReminderMessageBubble content={content} createdAt={createdAt} />
      </div>
    );
  }

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

        {/* Bot Author and Badge Header */}
        {messageType === 'system_bot' && !isDeleted && (
          <div className="flex items-center gap-1.5 mb-1 pb-0.5 border-b border-black/5 dark:border-white/5">
            <span className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {authorName || 'Bot'}
            </span>
            <BotMessageBadge size="sm" />
          </div>
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
          <MessageTextRenderer content={content} searchQuery={searchQuery} />
        )}

        {/* Timestamp, Star icon, Ephemeral clock, and Delivery Tick */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted float-right ml-3 -mb-0.5 select-none">
          {isE2EE && !isDeleted && <E2EEBubbleIndicator />}
          {isStarredState && !isDeleted && (
            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
          {expiresAt && !isDeleted && (
            <EphemeralClockBadge size="xs" />
          )}
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
              onPin={() => setIsPinModalOpen(true)}
              onStar={handleToggleStar}
              onReport={!isMe ? () => setIsReportModalOpen(true) : undefined}
              isStarred={isStarredState}
            />
          </div>
        )}

        {/* Pin Duration Modal */}
        {isPinModalOpen && (
          <PinDurationModal
            isOpen={isPinModalOpen}
            chatId={chatId || ''}
            messageId={id}
            onClose={() => setIsPinModalOpen(false)}
          />
        )}

        {/* Report Message Modal */}
        {isReportModalOpen && (
          <ReportMessageModal
            isOpen={isReportModalOpen}
            chatId={chatId || ''}
            reportedUserId={senderId || ''}
            reportedUserName={authorName || 'User'}
            messageId={id}
            messageSnippet={content}
            onClose={() => setIsReportModalOpen(false)}
          />
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
