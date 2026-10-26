'use client';

import React from 'react';
import MessageBubble from './MessageBubble';
import { cn } from '@/lib/utils';

// WhatsApp-style deterministic author colors for group chats
const AUTHOR_COLORS = [
  'text-emerald-500 dark:text-emerald-400',
  'text-indigo-500 dark:text-indigo-400',
  'text-amber-500 dark:text-amber-400',
  'text-rose-500 dark:text-rose-400',
  'text-cyan-500 dark:text-cyan-400',
  'text-purple-500 dark:text-purple-400',
  'text-teal-500 dark:text-teal-400',
  'text-orange-500 dark:text-orange-400',
];

export function getAuthorColor(authorId: string): string {
  if (!authorId) return AUTHOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = (hash << 5) - hash + authorId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AUTHOR_COLORS.length;
  return AUTHOR_COLORS[index];
}

export interface GroupMessageBubbleProps {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isMe: boolean;
  status: string;
  createdAt: string;
  className?: string;
}

export default function GroupMessageBubble({
  id,
  senderId,
  senderName,
  content,
  isMe,
  status,
  createdAt,
  className,
}: GroupMessageBubbleProps) {
  const authorColor = getAuthorColor(senderId);

  return (
    <div className={cn('relative group/msg w-full', className)}>
      {!isMe && senderName && (
        <div className="flex justify-start mb-0.5 ml-2">
          <span className={cn('text-xs font-semibold select-none', authorColor)}>
            {senderName}
          </span>
        </div>
      )}
      <MessageBubble
        id={id}
        content={content}
        isMe={isMe}
        status={status}
        createdAt={createdAt}
      />
    </div>
  );
}
