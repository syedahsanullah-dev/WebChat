'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import ConversationSnippet from '@/components/sidebar/ConversationSnippet';
import { format, isToday, isYesterday } from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationItemData {
  id: string;
  name: string;
  username?: string;
  avatar?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  ephemeralDuration?: number | null;
  otherUser?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface ConversationItemProps {
  chat: ConversationItemData;
  isSelected: boolean;
  isTyping?: boolean;
  typingUsername?: string | null;
  onSelect: (chatId: string) => void;
  className?: string;
}

export function formatChatTimestamp(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'dd/MM/yyyy');
}

export default function ConversationItem({
  chat,
  isSelected,
  isTyping = false,
  typingUsername,
  onSelect,
  className,
}: ConversationItemProps) {
  const timeFormatted = formatChatTimestamp(chat.lastMessageAt);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(chat.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(chat.id);
        }
      }}
      className={cn(
        'flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors outline-none select-none',
        isSelected
          ? 'bg-wa-light-active dark:bg-wa-dark-active'
          : 'hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover',
        className
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          name={chat.name}
          src={chat.avatar}
          size="lg"
          isOnline={chat.isOnline}
        />
        {chat.ephemeralDuration && chat.ephemeralDuration > 0 ? (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-wa-light-sidebar dark:bg-[#202c33] border border-black/10 dark:border-white/10 flex items-center justify-center text-[#00a884]"
            title="Disappearing messages active"
          >
            <Clock className="w-2.5 h-2.5" />
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-medium text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {chat.name}
            </span>
            {chat.ephemeralDuration && chat.ephemeralDuration > 0 ? (
              <Clock className="w-3 h-3 text-[#00a884] shrink-0" title="Disappearing messages active" />
            ) : null}
          </div>
          <span
            className={cn(
              'text-xs flex-shrink-0 ml-2',
              chat.unreadCount && chat.unreadCount > 0
                ? 'text-wa-green font-medium'
                : 'text-wa-light-text-muted dark:text-wa-dark-text-muted'
            )}
          >
            {timeFormatted}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <ConversationSnippet
            lastMessage={chat.lastMessage}
            isGroup={chat.isGroup}
            isTyping={isTyping}
            typingUsername={typingUsername}
          />

          {chat.unreadCount && chat.unreadCount > 0 ? (
            <span className="flex-shrink-0 ml-2 min-w-5 h-5 px-1.5 rounded-full bg-wa-green text-white text-[11px] font-bold flex items-center justify-center">
              {chat.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
