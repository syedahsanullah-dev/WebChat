'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { ShieldCheck, UserMinus, ShieldAlert, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupParticipantItem {
  id: string;
  userId: string;
  role: 'admin' | 'member' | string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

export interface MemberRowProps {
  participant: GroupParticipantItem;
  isCurrentUserAdmin: boolean;
  currentUserId: string;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  className?: string;
}

export default function MemberRow({
  participant,
  isCurrentUserAdmin,
  currentUserId,
  onPromote,
  onDemote,
  onRemove,
  onMessage,
  className,
}: MemberRowProps) {
  const isMe = participant.userId === currentUserId;
  const isAdmin = participant.role === 'admin';
  const displayName = participant.user.displayName || `@${participant.user.username}`;

  const menuItems: DropdownMenuItem[] = [];

  if (onMessage && !isMe) {
    menuItems.push({
      id: 'message',
      label: `Message @${participant.user.username}`,
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => onMessage(participant.userId),
    });
  }

  if (isCurrentUserAdmin && !isMe) {
    if (!isAdmin && onPromote) {
      menuItems.push({
        id: 'promote',
        label: 'Make group admin',
        icon: <ShieldCheck className="w-4 h-4" />,
        onClick: () => onPromote(participant.userId),
      });
    }

    if (isAdmin && onDemote) {
      menuItems.push({
        id: 'demote',
        label: 'Dismiss as admin',
        icon: <ShieldAlert className="w-4 h-4" />,
        onClick: () => onDemote(participant.userId),
      });
    }

    if (onRemove) {
      menuItems.push({
        id: 'remove',
        label: 'Remove from group',
        icon: <UserMinus className="w-4 h-4 text-red-500" />,
        onClick: () => onRemove(participant.userId),
      });
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors select-none',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          name={displayName}
          src={participant.user.avatarUrl}
          size="md"
          isOnline={participant.user.isOnline}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {displayName} {isMe && <span className="text-wa-green text-xs font-normal">(You)</span>}
            </h4>
          </div>
          <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
            @{participant.user.username}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isAdmin && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-wa-green/15 text-wa-green border border-wa-green/30 select-none">
            Group Admin
          </span>
        )}

        {menuItems.length > 0 && <DropdownMenu items={menuItems} align="right" />}
      </div>
    </div>
  );
}
