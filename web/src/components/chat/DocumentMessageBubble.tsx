'use client';

import React, { useState } from 'react';
import FileTypeIcon from '@/components/ui/FileTypeIcon';
import DocumentPreviewModal from './DocumentPreviewModal';
import MessageStatusTick, { MessageStatusType } from './MessageStatusTick';
import ReactionHoverBar from './ReactionHoverBar';
import EmojiReactionPill from './EmojiReactionPill';
import MessageContextMenu from './MessageContextMenu';
import EphemeralClockBadge from './EphemeralClockBadge';
import QuotedMessageSnippet from './QuotedMessageSnippet';
import { formatFileSize, getDocumentCategory, getFileExtension } from '@/lib/fileValidation';
import { format } from 'date-fns';
import { Download, Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentMessageBubbleProps {
  id: string;
  documentName: string;
  documentSize?: number | null;
  documentMime?: string | null;
  mediaUrl: string;
  isMe: boolean;
  status?: MessageStatusType | string;
  createdAt: string | Date;
  senderName?: string;
  replyToId?: string | null;
  replyToMessage?: any;
  reactions?: Record<string, string[]> | null;
  isStarred?: boolean;
  expiresAt?: string | Date | null;
  currentUserId?: string;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
  onJumpToOriginal?: (targetId: string) => void;
  className?: string;
}

export default function DocumentMessageBubble({
  id,
  documentName,
  documentSize,
  documentMime,
  mediaUrl,
  isMe,
  status = 'sent',
  createdAt,
  senderName,
  replyToId,
  replyToMessage,
  reactions,
  isStarred = false,
  expiresAt,
  currentUserId = '',
  onReply,
  onReact,
  onDelete,
  onJumpToOriginal,
  className,
}: DocumentMessageBubbleProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [isStarredState, setIsStarredState] = useState(isStarred);

  const category = getDocumentCategory(documentName, documentMime || undefined);
  const isPdf = category === 'pdf';
  const ext = getFileExtension(documentName).toUpperCase() || 'FILE';

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime()) ? format(dateObj, 'h:mm a') : '';

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

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      const copyUrl = mediaUrl.startsWith('http')
        ? mediaUrl
        : `${window.location.origin}${mediaUrl}`;
      navigator.clipboard?.writeText(copyUrl).catch(() => {});
    }
  };

  return (
    <>
      <div
        id={`msg-${id}`}
        onMouseEnter={() => setShowReactionsBar(true)}
        onMouseLeave={() => setShowReactionsBar(false)}
        className={cn(
          'flex w-full group relative select-text transition-colors duration-200 my-1',
          isMe ? 'justify-end' : 'justify-start',
          className
        )}
      >
        <div
          className={cn(
            'max-w-[85%] sm:max-w-[75%] md:max-w-[65%] min-w-[240px] sm:min-w-[280px] p-2 rounded-lg shadow-xs text-sm relative break-words transition-all',
            isMe
              ? 'bg-wa-light-sent dark:bg-wa-dark-sent text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tr-none'
              : 'bg-wa-light-received dark:bg-wa-dark-received text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tl-none'
          )}
        >
          {/* Quick Reaction Hover Bar */}
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

          {/* Quoted Reply Snippet if any */}
          {replyToMessage && (
            <QuotedMessageSnippet
              authorName={replyToMessage.senderName || 'Reply'}
              content={replyToMessage.content}
              isMe={isMe}
              onClick={() => onJumpToOriginal?.(replyToMessage.id || replyToId || '')}
            />
          )}

          {/* Document Content Card */}
          <div className="w-full rounded-lg p-2.5 bg-black/5 dark:bg-black/20 border border-black/10 dark:border-white/10 flex items-center justify-between gap-3 select-none">
            {/* Left: Color-coded Document Icon */}
            <FileTypeIcon filename={documentName} mimeType={documentMime || undefined} size="md" />

            {/* Center: File Title & Size Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs sm:text-sm font-semibold text-wa-light-text-primary dark:text-white truncate"
                title={documentName}
              >
                {documentName}
              </p>
              <p className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-0.5">
                {formatFileSize(documentSize)} &bull; {ext}
              </p>
            </div>

            {/* Right Actions: Preview (if PDF) & Download */}
            <div className="flex items-center gap-1 shrink-0">
              {isPdf && (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-[#00a884] dark:hover:text-[#00a884] transition-colors"
                  title="Preview document"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              <a
                href={mediaUrl}
                download={documentName}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-[#00a884] dark:hover:text-[#00a884] transition-colors"
                title="Download document"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Timestamp, Star icon, Ephemeral clock, and Delivery Tick */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted float-right ml-3 -mb-0.5 select-none">
            {isStarredState && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {expiresAt && <EphemeralClockBadge size="xs" />}
            <span>{timeFormatted}</span>
            {isMe && <MessageStatusTick status={status} />}
          </div>

          {/* Message Context Action Menu */}
          <div className="absolute top-1 right-1 z-10">
            <MessageContextMenu
              isMe={isMe}
              onReply={() => onReply?.()}
              onReact={() => setShowReactionsBar(true)}
              onCopy={handleCopy}
              onDelete={() => onDelete?.()}
              onPin={() => {}}
              onStar={handleToggleStar}
              isStarred={isStarredState}
            />
          </div>

          {/* Bottom Reaction Pill Badge */}
          <EmojiReactionPill
            reactions={reactions}
            currentUserId={currentUserId}
            onToggleReaction={(emoji) => onReact?.(emoji)}
          />
        </div>
      </div>

      {/* PDF Modal Viewer */}
      {isPdf && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          documentUrl={mediaUrl}
          documentName={documentName}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}
