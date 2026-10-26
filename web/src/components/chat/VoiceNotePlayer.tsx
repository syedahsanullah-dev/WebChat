'use client';

import React, { useState } from 'react';
import { Play, Pause, Mic, Ban } from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatDuration } from '@/lib/audioUtils';
import WaveformVisualizer from './WaveformVisualizer';
import MessageStatusTick, { MessageStatusType } from './MessageStatusTick';
import QuotedMessageSnippet from './QuotedMessageSnippet';
import ReactionHoverBar from './ReactionHoverBar';
import EmojiReactionPill from './EmojiReactionPill';
import MessageContextMenu from './MessageContextMenu';
import Avatar from '@/components/ui/Avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { QuotedMessageInfo } from './MessageBubble';

export interface VoiceNotePlayerProps {
  id: string;
  mediaUrl: string;
  duration?: number | null;
  waveform?: number[] | null;
  senderName?: string;
  senderAvatar?: string | null;
  isMe: boolean;
  status?: MessageStatusType | string;
  createdAt: string | Date;
  replyToId?: string | null;
  replyToMessage?: QuotedMessageInfo | null;
  reactions?: Record<string, string[]> | null;
  isDeleted?: boolean;
  currentUserId?: string;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
  onJumpToOriginal?: (targetId: string) => void;
  className?: string;
}

export default function VoiceNotePlayer({
  id,
  mediaUrl,
  duration = 0,
  waveform,
  senderName = 'User',
  senderAvatar,
  isMe,
  status = 'sent',
  createdAt,
  replyToId,
  replyToMessage,
  reactions,
  isDeleted = false,
  currentUserId = '',
  onReply,
  onReact,
  onDelete,
  onJumpToOriginal,
  className,
}: VoiceNotePlayerProps) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);

  const {
    isPlaying,
    currentTime,
    duration: playerDuration,
    playbackRate,
    progress,
    togglePlay,
    seek,
    changePlaybackRate,
  } = useAudioPlayer({
    src: mediaUrl,
    initialDuration: duration || 0,
  });

  const handlePlayToggle = () => {
    if (!hasPlayed) setHasPlayed(true);
    togglePlay();
  };

  const effectiveDuration = playerDuration || duration || 0;
  const timeDisplay = isPlaying
    ? formatDuration(currentTime)
    : formatDuration(effectiveDuration);

  const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const timeFormatted = !isNaN(dateObj.getTime())
    ? format(dateObj, 'h:mm a')
    : '';

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
        'flex w-full select-none group relative transition-colors duration-200',
        isMe ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-[270px] xs:max-w-[310px] sm:max-w-[360px] p-2.5 rounded-2xl shadow-xs transition-colors relative overflow-visible',
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

        {/* Quoted Reply Snippet */}
        {replyToMessage && (
          <div className="mb-2">
            <QuotedMessageSnippet
              authorName={replyToMessage.senderName || 'Reply'}
              content={replyToMessage.content}
              isMe={isMe}
              onClick={() => onJumpToOriginal?.(replyToMessage.id || replyToId || '')}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Avatar with microphone status badge */}
          <div className="relative flex-shrink-0">
            <Avatar name={senderName} src={senderAvatar} size="md" />
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white ring-2',
                isMe
                  ? 'bg-wa-green ring-wa-light-sent dark:ring-wa-dark-sent'
                  : hasPlayed
                  ? 'bg-wa-blue ring-wa-light-received dark:ring-wa-dark-received'
                  : 'bg-wa-green ring-wa-light-received dark:ring-wa-dark-received'
              )}
            >
              <Mic className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={handlePlayToggle}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 text-wa-light-text-primary dark:text-wa-dark-text-primary transition-all flex-shrink-0 focus:outline-none cursor-pointer"
            aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Waveform & Duration */}
          <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
            <WaveformVisualizer
              peaks={waveform || []}
              progress={progress}
              onSeek={seek}
              isMe={isMe}
              interactive={true}
              className="w-full"
            />

            <div className="flex items-center justify-between text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-0.5">
              <span>{timeDisplay}</span>

              {/* Speed pill button (visible during or after playback) */}
              {(isPlaying || hasPlayed) && (
                <button
                  type="button"
                  onClick={changePlaybackRate}
                  className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 text-[10px] font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors focus:outline-none cursor-pointer"
                  title="Playback speed"
                >
                  {playbackRate}x
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timestamp and delivery ticks */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
          <span>{timeFormatted}</span>
          {isMe && <MessageStatusTick status={status} />}
        </div>

        {/* Message Context Action Menu */}
        <div className="absolute top-1 right-1 z-10">
          <MessageContextMenu
            isMe={isMe}
            onReply={() => onReply?.()}
            onReact={() => setShowReactionsBar(true)}
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
