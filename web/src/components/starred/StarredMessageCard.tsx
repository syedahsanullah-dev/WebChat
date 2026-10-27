'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export interface StarredItem {
  id: string;
  messageId: string;
  chatId: string;
  chatTitle: string;
  chatAvatar?: string | null;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  starredAt: string;
  createdAt: string;
}

export interface StarredMessageCardProps {
  item: StarredItem;
  onClick: (chatId: string, messageId: string) => void;
  onUnstar: (messageId: string) => void;
}

export default function StarredMessageCard({
  item,
  onClick,
  onUnstar,
}: StarredMessageCardProps) {
  const dateFormatted = item.createdAt
    ? format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')
    : '';

  return (
    <div
      onClick={() => onClick(item.chatId, item.messageId)}
      className="p-3 rounded-xl border border-[#e9edef] dark:border-white/10 hover:border-[#00a884]/40 bg-white dark:bg-[#202c33] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer select-none space-y-2 group"
    >
      {/* Top Header: Chat Title & Unstar Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={item.chatAvatar} name={item.chatTitle} size="sm" />
          <span className="font-semibold text-xs text-wa-light-text-primary dark:text-white truncate">
            {item.chatTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
            {dateFormatted}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnstar(item.messageId);
            }}
            className="p-1 rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
            title="Unstar message"
          >
            <Star className="w-3.5 h-3.5 fill-amber-500" />
          </button>
        </div>
      </div>

      {/* Message Content Preview */}
      <div className="space-y-0.5 pl-1">
        <span className="text-[11px] font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          {item.senderName}:
        </span>
        <p className="text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary line-clamp-2 leading-relaxed">
          {item.content || (item.mediaUrl ? '📷 Photo' : 'Message')}
        </p>
      </div>
    </div>
  );
}
