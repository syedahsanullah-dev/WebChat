'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import MessageBubble, { QuotedMessageInfo } from './MessageBubble';
import ImageBubble from './ImageBubble';
import VoiceNotePlayer from './VoiceNotePlayer';
import SystemMessageBubble from './SystemMessageBubble';
import CallLogBadge from '@/components/call/CallLogBadge';
import Lightbox from './Lightbox';
import DateDivider from './DateDivider';
import E2EEHeaderBadge from './E2EEHeaderBadge';
import { getAuthorColor } from './GroupMessageBubble';
import { Lock, Loader2 } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export interface MessageItem {
  id: string;
  tempId?: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  waveform?: number[] | null;
  replyToId?: string | null;
  isDeleted?: boolean;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  status: string;
  createdAt: string;
}

export interface MessageListProps {
  messages: MessageItem[];
  currentUserId: string;
  isGroup?: boolean;
  searchQuery?: string;
  reactionsByMessage?: Record<string, Record<string, string[]>>;
  isLoadingOlder?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onReply?: (message: MessageItem) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (message: MessageItem) => void;
  onVerifySecurity?: () => void;
}

export default function MessageList({
  messages,
  currentUserId,
  isGroup = false,
  searchQuery,
  reactionsByMessage,
  isLoadingOlder = false,
  hasMore = false,
  onLoadMore,
  onReply,
  onReact,
  onDelete,
  onVerifySecurity,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const [lightboxData, setLightboxData] = useState<{
    src: string;
    caption?: string | null;
  } | null>(null);

  // Auto-scroll to bottom on initial load and when new messages arrive at the bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isInitialLoadRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      isInitialLoadRef.current = false;
    } else {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [messages.length]);

  // Preserve scroll position when older messages are prepended
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && prevScrollHeightRef.current > 0) {
      const heightDifference = container.scrollHeight - prevScrollHeightRef.current;
      if (heightDifference > 0) {
        container.scrollTop += heightDifference;
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 60 && hasMore && !isLoadingOlder && onLoadMore) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  };

  const findQuotedMessage = (replyToId?: string | null): QuotedMessageInfo | null => {
    if (!replyToId) return null;
    const found = messages.find((m) => m.id === replyToId || m.tempId === replyToId);
    if (!found) return null;
    return {
      id: found.id,
      senderName: found.senderName || (found.senderId === currentUserId ? 'You' : 'User'),
      content:
        found.messageType === 'image'
          ? '📷 Photo'
          : found.messageType === 'voice'
          ? '🎤 Voice note'
          : found.content,
    };
  };

  const handleJumpToOriginal = (targetId: string) => {
    if (!targetId || typeof window === 'undefined') return;
    const el = document.getElementById(`msg-${targetId}`);
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      const targetTop = Math.max(0, relativeTop - container.clientHeight / 2);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = targetTop;
      }
      el.classList.add('wa-search-highlight-flash');
      setTimeout(() => el.classList.remove('wa-search-highlight-flash'), 1200);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 min-w-0 wa-chat-bg overflow-y-auto p-4 sm:p-6 space-y-2 z-0 relative select-text"
    >
      {/* Loading older messages indicator */}
      {isLoadingOlder && (
        <div className="flex justify-center py-2">
          <div className="p-2 rounded-full bg-wa-light-header/80 dark:bg-wa-dark-header/80 shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-wa-green" />
          </div>
        </div>
      )}

      {/* WhatsApp End-to-End Encryption Banner */}
      <E2EEHeaderBadge onVerifySecurity={onVerifySecurity} />

      {/* Render messages with Date Dividers */}
      {messages.map((msg, index) => {
        const isMe = msg.senderId === currentUserId;
        const currentDate = new Date(msg.createdAt);
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;

        const showDateDivider = !prevDate || !isSameDay(currentDate, prevDate);

        // Call log badges: in-chat voice call outcomes
        if (msg.messageType === 'call' || (msg.messageType === 'system' && msg.content?.startsWith('📞'))) {
          return (
            <React.Fragment key={msg.id || msg.tempId || index}>
              {showDateDivider && <DateDivider date={currentDate} />}
              <CallLogBadge id={msg.id} content={msg.content} createdAt={msg.createdAt} />
            </React.Fragment>
          );
        }

        // System messages: centered announcement pill
        if (msg.messageType === 'system') {
          return (
            <React.Fragment key={msg.id || msg.tempId || index}>
              {showDateDivider && <DateDivider date={currentDate} />}
              <SystemMessageBubble id={msg.id} content={msg.content} createdAt={msg.createdAt} />
            </React.Fragment>
          );
        }

        const isVoice =
          msg.messageType === 'voice' ||
          (Boolean(msg.mediaUrl) && typeof msg.mediaDuration === 'number' && msg.mediaDuration > 0);

        const isImage = !isVoice && (msg.messageType === 'image' || Boolean(msg.mediaUrl));

        let waveformPeaks: number[] | null = msg.waveform || null;
        if (!waveformPeaks && msg.content && msg.content.startsWith('[') && msg.content.endsWith(']')) {
          try {
            const parsed = JSON.parse(msg.content);
            if (Array.isArray(parsed)) {
              waveformPeaks = parsed;
            }
          } catch {
            waveformPeaks = null;
          }
        }

        const quotedMsg = findQuotedMessage(msg.replyToId);
        const reactions = reactionsByMessage?.[msg.id] || null;

        return (
          <React.Fragment key={msg.id || msg.tempId || index}>
            {showDateDivider && <DateDivider date={currentDate} />}

            {/* In group chats: sender display name above received message */}
            {isGroup && !isMe && msg.senderName && (
              <div className="flex justify-start ml-2 -mb-1">
                <span className={cn('text-xs font-semibold select-none', getAuthorColor(msg.senderId))}>
                  {msg.senderName}
                </span>
              </div>
            )}

            {isVoice && msg.mediaUrl ? (
              <VoiceNotePlayer
                id={msg.id || msg.tempId || `voice-${index}`}
                mediaUrl={msg.mediaUrl}
                duration={msg.mediaDuration || 0}
                waveform={waveformPeaks}
                senderName={msg.senderName}
                isMe={isMe}
                status={msg.status}
                createdAt={msg.createdAt}
                replyToId={msg.replyToId}
                replyToMessage={quotedMsg}
                reactions={reactions}
                isDeleted={msg.isDeleted}
                currentUserId={currentUserId}
                onReply={() => onReply?.(msg)}
                onReact={(emoji) => onReact?.(msg.id, emoji)}
                onDelete={() => onDelete?.(msg)}
                onJumpToOriginal={handleJumpToOriginal}
              />
            ) : isImage && msg.mediaUrl ? (
              <ImageBubble
                id={msg.id || msg.tempId || `img-${index}`}
                mediaUrl={msg.mediaUrl}
                caption={msg.content}
                isMe={isMe}
                status={msg.status}
                createdAt={msg.createdAt}
                replyToId={msg.replyToId}
                replyToMessage={quotedMsg}
                reactions={reactions}
                isDeleted={msg.isDeleted}
                isE2EE={msg.isE2EE}
                searchQuery={searchQuery}
                currentUserId={currentUserId}
                onReply={() => onReply?.(msg)}
                onReact={(emoji) => onReact?.(msg.id, emoji)}
                onDelete={() => onDelete?.(msg)}
                onJumpToOriginal={handleJumpToOriginal}
                onOpenLightbox={(src, caption) => setLightboxData({ src, caption })}
              />
            ) : (
              <MessageBubble
                id={msg.id}
                content={msg.content}
                isMe={isMe}
                status={msg.status}
                createdAt={msg.createdAt}
                replyToId={msg.replyToId}
                replyToMessage={quotedMsg}
                reactions={reactions}
                isDeleted={msg.isDeleted}
                isE2EE={msg.isE2EE}
                searchQuery={searchQuery}
                currentUserId={currentUserId}
                onReply={() => onReply?.(msg)}
                onReact={(emoji) => onReact?.(msg.id, emoji)}
                onDelete={() => onDelete?.(msg)}
                onJumpToOriginal={handleJumpToOriginal}
              />
            )}
          </React.Fragment>
        );
      })}

      <div ref={bottomRef} className="h-0.5" />

      {/* Lightbox Fullscreen Viewer */}
      <Lightbox
        isOpen={Boolean(lightboxData)}
        src={lightboxData?.src || ''}
        caption={lightboxData?.caption}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}
