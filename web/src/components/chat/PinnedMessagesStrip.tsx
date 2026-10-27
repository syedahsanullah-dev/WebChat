'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PinnedMessageItem } from '@shared/types';
import { useWebSocket } from '@/context/WebSocketContext';
import { Pin, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface PinnedMessagesStripProps {
  chatId: string;
}

export default function PinnedMessagesStrip({ chatId }: PinnedMessagesStripProps) {
  const { subscribe } = useWebSocket();
  const [pins, setPins] = useState<PinnedMessageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`);
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to load pinned messages:', err);
    }
  }, [chatId]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  // Subscribe to real-time chat:pin_updated WebSocket envelopes
  useEffect(() => {
    const unsubscribe = subscribe('chat:pin_updated', (payload: any) => {
      if (payload.chatId !== chatId) return;
      if (Array.isArray(payload.activePins)) {
        setPins(payload.activePins);
        setCurrentIndex(0);
      } else {
        fetchPins();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, subscribe, fetchPins]);

  if (pins.length === 0) return null;

  const currentPin = pins[currentIndex] || pins[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pins.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + pins.length) % pins.length);
  };

  const handleUnpin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPin) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/pin?messageId=${currentPin.messageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setPins(data.activePins || []);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to unpin message:', err);
    }
  };

  const handleJumpToMessage = () => {
    if (!currentPin) return;
    const el = document.getElementById(`msg-${currentPin.messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#00a884]', 'bg-[#00a884]/20', 'animate-pulse');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#00a884]', 'bg-[#00a884]/20', 'animate-pulse');
      }, 1500);
    }
  };

  return (
    <div
      onClick={handleJumpToMessage}
      className="h-10 px-3 bg-wa-light-header/95 dark:bg-[#202c33] border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-2 select-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20"
      title="Click to jump to pinned message"
    >
      {/* Left: Pin Icon + Snippet */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="p-1 rounded-full bg-[#00a884]/15 text-[#00a884] shrink-0">
          <Pin className="w-3.5 h-3.5 fill-[#00a884]" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          <span className="font-semibold text-wa-light-text-primary dark:text-white shrink-0">
            {currentPin.messageSenderName || 'Pinned Message'}:
          </span>
          <span className="truncate text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            {currentPin.messageSnippet || 'Attachment'}
          </span>
        </div>
      </div>

      {/* Right: Multi-pin Carousel Navigation + Unpin */}
      <div className="flex items-center gap-1 shrink-0">
        {pins.length > 1 && (
          <div className="flex items-center text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mr-1">
            <button
              onClick={handlePrev}
              className="p-1 hover:text-wa-light-text-primary transition-colors"
              title="Previous pin"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-medium">
              {currentIndex + 1} of {pins.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 hover:text-wa-light-text-primary transition-colors"
              title="Next pin"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={handleUnpin}
          className="p-1 rounded-md text-wa-light-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title="Unpin message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
