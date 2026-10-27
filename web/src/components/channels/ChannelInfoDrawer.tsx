'use client';

import React, { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { ChannelView } from '@shared/types';
import { formatSubscriberCount } from '@/lib/channelUtils';
import {
  X,
  BadgeCheck,
  Users,
  Copy,
  Check,
  Share2,
  Bell,
  BellOff,
  LogOut,
  Calendar,
  Lock,
} from 'lucide-react';

export interface ChannelInfoDrawerProps {
  channel: ChannelView;
  isOpen: boolean;
  onClose: () => void;
  onUnfollow: (channelId: string) => void;
}

export default function ChannelInfoDrawer({
  channel,
  isOpen,
  onClose,
  onUnfollow,
}: ChannelInfoDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/channel/${channel.publicSlug || channel.id}`
    : `/channel/${channel.publicSlug || channel.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-l border-[#e9edef] dark:border-white/10 z-50 shadow-2xl flex flex-col animate-slideLeft select-none">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-[#e9edef] dark:border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
          Channel Info
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-muted hover:text-wa-light-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 shadow-xs">
          <div className="relative mb-3">
            <Avatar name={channel.title} src={channel.avatarUrl} size="lg" />
            {channel.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#00a884] text-white rounded-full p-1 border-2 border-white dark:border-[#111b21]">
                <BadgeCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          <h2 className="text-base font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {channel.title}
          </h2>

          <div className="flex items-center gap-1.5 text-xs text-wa-light-text-muted mt-1">
            <Users className="w-3.5 h-3.5" />
            <span>{formatSubscriberCount(channel.subscriberCount)} followers</span>
          </div>

          {channel.publicSlug && (
            <span className="text-[11px] font-mono text-[#00a884] mt-1">
              @{channel.publicSlug}
            </span>
          )}
        </div>

        {/* Description */}
        {channel.description && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 shadow-xs space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-wa-light-text-muted">
              Description
            </span>
            <p className="text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary leading-relaxed whitespace-pre-wrap">
              {channel.description}
            </p>
          </div>
        )}

        {/* Channel Invite Link */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 shadow-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-wa-light-text-muted flex items-center justify-between">
            <span>Channel Invite Link</span>
            <Share2 className="w-3.5 h-3.5" />
          </span>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-[#e9edef] dark:border-white/5 text-xs font-mono text-wa-light-text-secondary truncate">
            <span className="truncate flex-1">{inviteUrl}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[#00a884] transition-colors"
              title="Copy Link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Channel Settings / Actions */}
        <div className="rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 shadow-xs divide-y divide-[#e9edef] dark:divide-white/5 text-xs">
          <div
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isMuted ? (
                <BellOff className="w-4 h-4 text-wa-light-text-muted" />
              ) : (
                <Bell className="w-4 h-4 text-wa-light-text-secondary" />
              )}
              <span className="text-wa-light-text-primary dark:text-wa-dark-text-primary font-medium">
                Mute Notifications
              </span>
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors p-0.5 ${isMuted ? 'bg-[#00a884]' : 'bg-gray-300 dark:bg-white/20'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isMuted ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3 text-wa-light-text-muted">
            <Lock className="w-4 h-4" />
            <span>Public broadcast channel</span>
          </div>
        </div>

        {/* Unfollow button */}
        {!channel.isAdmin && channel.isSubscribed && (
          <button
            onClick={() => {
              onUnfollow(channel.id);
              onClose();
            }}
            type="button"
            className="w-full py-3 px-4 rounded-2xl border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Unfollow Channel</span>
          </button>
        )}
      </div>
    </div>
  );
}
