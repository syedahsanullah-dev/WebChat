'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StarredMessageCard, { StarredItem } from './StarredMessageCard';
import { X, Star, Search, Loader2 } from 'lucide-react';

export interface StarredMessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (chatId: string, messageId: string) => void;
}

export default function StarredMessagesDrawer({
  isOpen,
  onClose,
  onSelectMessage,
}: StarredMessagesDrawerProps) {
  const [starred, setStarred] = useState<StarredItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStarred = useCallback(async () => {
    try {
      setLoading(true);
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await fetch(`/api/messages/starred${q}`);
      if (res.ok) {
        const data = await res.json();
        setStarred(data.starred || []);
      }
    } catch (err) {
      console.error('Failed to load starred messages:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchStarred();
    }
  }, [isOpen, fetchStarred]);

  if (!isOpen) return null;

  const handleUnstar = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/star`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStarred((prev) => prev.filter((s) => s.messageId !== messageId));
      }
    } catch (err) {
      console.error('Failed to unstar message:', err);
    }
  };

  const handleCardClick = (chatId: string, messageId: string) => {
    onSelectMessage(chatId, messageId);
    onClose();

    // After switching chat, trigger scroll jump with highlight pulse
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[#00a884]', 'bg-[#00a884]/20', 'animate-pulse');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[#00a884]', 'bg-[#00a884]/20', 'animate-pulse');
        }, 1500);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-y-0 left-0 w-80 sm:w-96 bg-wa-light-sidebar dark:bg-[#111b21] border-r border-[#e9edef] dark:border-white/10 z-50 shadow-2xl flex flex-col animate-slideRight select-none">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-[#e9edef] dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h3 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Starred Messages
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-muted hover:text-wa-light-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Filter */}
      <div className="p-3 border-b border-[#e9edef] dark:border-white/10">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-wa-light-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search starred messages..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>
      </div>

      {/* Starred Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-[#00a884] animate-spin" />
            <span className="text-xs text-wa-light-text-muted">Loading starred messages...</span>
          </div>
        ) : starred.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
            <Star className="w-8 h-8 text-wa-light-text-muted opacity-40" />
            <p className="text-xs text-wa-light-text-muted max-w-xs">
              No starred messages yet. Star important messages to easily find them later.
            </p>
          </div>
        ) : (
          starred.map((item) => (
            <StarredMessageCard
              key={item.id}
              item={item}
              onClick={handleCardClick}
              onUnstar={handleUnstar}
            />
          ))
        )}
      </div>
    </div>
  );
}
