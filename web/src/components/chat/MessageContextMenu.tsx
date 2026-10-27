'use client';

import React from 'react';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Reply, Smile, Copy, Trash2, Star, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageContextMenuProps {
  isMe: boolean;
  onReply: () => void;
  onReact: () => void;
  onCopy?: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onStar?: () => void;
  isStarred?: boolean;
  className?: string;
}

export default function MessageContextMenu({
  isMe,
  onReply,
  onReact,
  onCopy,
  onDelete,
  onPin,
  onStar,
  isStarred = false,
  className,
}: MessageContextMenuProps) {
  const items: DropdownMenuItem[] = [
    {
      id: 'reply',
      label: 'Reply',
      icon: <Reply className="w-4 h-4" />,
      onClick: onReply,
    },
    {
      id: 'react',
      label: 'React',
      icon: <Smile className="w-4 h-4" />,
      onClick: onReact,
    },
    ...(onStar
      ? [
          {
            id: 'star',
            label: isStarred ? 'Unstar message' : 'Star message',
            icon: <Star className={cn('w-4 h-4', isStarred && 'text-amber-500 fill-amber-500')} />,
            onClick: onStar,
          },
        ]
      : []),
    ...(onPin
      ? [
          {
            id: 'pin',
            label: 'Pin message',
            icon: <Pin className="w-4 h-4" />,
            onClick: onPin,
          },
        ]
      : []),
    ...(onCopy
      ? [
          {
            id: 'copy',
            label: 'Copy',
            icon: <Copy className="w-4 h-4" />,
            onClick: onCopy,
          },
        ]
      : []),
    {
      id: 'delete',
      label: 'Delete message',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      onClick: onDelete,
    },
  ];

  return (
    <div className={cn('opacity-0 group-hover:opacity-100 transition-opacity', className)}>
      <DropdownMenu items={items} align={isMe ? 'right' : 'left'} />
    </div>
  );
}
