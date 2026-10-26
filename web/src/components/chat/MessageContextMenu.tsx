'use client';

import React from 'react';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Reply, Smile, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageContextMenuProps {
  isMe: boolean;
  onReply: () => void;
  onReact: () => void;
  onCopy?: () => void;
  onDelete: () => void;
  className?: string;
}

export default function MessageContextMenu({
  isMe,
  onReply,
  onReact,
  onCopy,
  onDelete,
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
