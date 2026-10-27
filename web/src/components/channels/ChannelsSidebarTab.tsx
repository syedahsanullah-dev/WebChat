'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ChannelListItem from './ChannelListItem';
import CreateChannelModal from './CreateChannelModal';
import { ChannelView } from '@shared/types';
import { Search, Plus, Megaphone, Loader2, Compass } from 'lucide-react';

export interface ChannelsSidebarTabProps {
  activeChannelId?: string | null;
  onSelectChannel: (channelId: string) => void;
}

export default function ChannelsSidebarTab({
  activeChannelId,
  onSelectChannel,
}: ChannelsSidebarTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [subscribedChannels, setSubscribedChannels] = useState<ChannelView[]>([]);
  const [discoverableChannels, setDiscoverableChannels] = useState<ChannelView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchChannels = useCallback(async () => {
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await fetch(`/api/channels${q}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribedChannels(data.subscribed || []);
        setDiscoverableChannels(data.discoverable || []);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSubscribeToggle = async (channelId: string, currentSubscribed: boolean) => {
    try {
      const method = currentSubscribed ? 'DELETE' : 'POST';
      const res = await fetch(`/api/channels/${channelId}/subscribe`, {
        method,
      });
      if (res.ok) {
        fetchChannels();
      }
    } catch (err) {
      console.error('Failed to toggle channel subscription:', err);
    }
  };

  const handleChannelCreated = (newChannel: any) => {
    fetchChannels();
    onSelectChannel(newChannel.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header with Search and Create Button */}
      <div className="p-3 border-b border-[#e9edef] dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#00a884]" />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Broadcast Channels
            </h3>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs transition-all flex items-center gap-1 text-[11px] font-semibold px-2.5"
            title="Create new broadcast channel"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-wa-light-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center text-wa-light-text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-[#00a884] mb-2" />
            <span className="text-xs">Loading channels...</span>
          </div>
        ) : (
          <>
            {/* Subscribed Channels */}
            {subscribedChannels.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 text-wa-light-text-muted">
                  Followed Channels ({subscribedChannels.length})
                </span>
                {subscribedChannels.map((c) => (
                  <ChannelListItem
                    key={c.id}
                    channel={c}
                    isActive={activeChannelId === c.id}
                    onClick={() => onSelectChannel(c.id)}
                    onSubscribeToggle={handleSubscribeToggle}
                  />
                ))}
              </div>
            )}

            {/* Discoverable Channels */}
            {discoverableChannels.length > 0 && (
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 text-wa-light-text-muted flex items-center gap-1">
                  <Compass className="w-3 h-3 text-[#00a884]" />
                  <span>Discover Channels</span>
                </span>
                {discoverableChannels.map((c) => (
                  <ChannelListItem
                    key={c.id}
                    channel={c}
                    isActive={activeChannelId === c.id}
                    onClick={() => onSelectChannel(c.id)}
                    onSubscribeToggle={handleSubscribeToggle}
                  />
                ))}
              </div>
            )}

            {subscribedChannels.length === 0 && discoverableChannels.length === 0 && (
              <div className="p-8 text-center space-y-2">
                <Megaphone className="w-8 h-8 text-wa-light-text-muted mx-auto" />
                <h5 className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  No Channels Found
                </h5>
                <p className="text-[11px] text-wa-light-text-secondary">
                  Create a channel or follow exciting public broadcasts.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onChannelCreated={handleChannelCreated}
      />
    </div>
  );
}
