'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { ChannelView } from '@shared/types';
import { formatSubscriberCount } from '@/lib/channelUtils';
import { BadgeCheck, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChannelListItemProps {
  channel: ChannelView;
  isActive?: boolean;
  onClick: () => void;
  onSubscribeToggle?: (channelId: string, currentSubscribed: boolean) => void;
}

export default function ChannelListItem({
  channel,
  isActive = false,
  onClick,
  onSubscribeToggle,
}: ChannelListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all select-none group',
        isActive
          ? 'bg-black/10 dark:bg-white/10 shadow-xs'
          : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
    >
      {/* Channel Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar name={channel.title} src={channel.avatarUrl} size="md" />
        {channel.isVerified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#00a884] text-white rounded-full p-0.5 border-2 border-white dark:border-[#111b21]">
            <BadgeCheck className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary truncate flex items-center gap-1">
            <span>{channel.title}</span>
            {channel.isAdmin && (
              <span title="You are an admin">
                <Shield className="w-3 h-3 text-[#00a884] flex-shrink-0" />
              </span>
            )}
          </h4>
        </div>

        <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate mt-0.5">
          {channel.description || 'Broadcast announcement channel'}
        </p>

        <div className="flex items-center gap-2 mt-1 text-[10px] text-wa-light-text-muted">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{formatSubscriberCount(channel.subscriberCount)} followers</span>
          </span>
          {channel.publicSlug && (
            <span>&bull; @{channel.publicSlug}</span>
          )}
        </div>
      </div>

      {/* Follow / Following button if not active */}
      {onSubscribeToggle && !channel.isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSubscribeToggle(channel.id, Boolean(channel.isSubscribed));
          }}
          type="button"
          className={cn(
            'text-[11px] font-semibold px-3 py-1 rounded-full transition-all flex-shrink-0',
            channel.isSubscribed
              ? 'border border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30'
              : 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs'
          )}
        >
          {channel.isSubscribed ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}
