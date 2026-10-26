'use client';

import React from 'react';
import SearchInput from '@/components/ui/SearchInput';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InChatSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  currentMatchNumber: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  className?: string;
}

export default function InChatSearchDrawer({
  isOpen,
  onClose,
  query,
  onQueryChange,
  currentMatchNumber,
  totalMatches,
  onNextMatch,
  onPrevMatch,
  className,
}: InChatSearchDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 md:inset-y-0 md:left-auto md:right-0 w-full md:w-[340px] lg:w-[380px] h-full flex flex-col bg-wa-light-sidebar dark:bg-wa-dark-sidebar md:border-l border-wa-light-border dark:border-wa-dark-border shadow-2xl z-30 transition-all select-none animate-in slide-in-from-right-4 duration-150',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-wa-light-header dark:bg-wa-dark-header border-b border-wa-light-border dark:border-wa-dark-border flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary focus:outline-none"
          aria-label="Close search"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
          Search messages
        </h3>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 border-b border-wa-light-border dark:border-wa-dark-border flex items-center gap-2">
        <SearchInput
          placeholder="Search in conversation..."
          value={query}
          onChange={onQueryChange}
          onClear={() => onQueryChange('')}
          className="flex-1"
        />

        {/* Chevrons & Match count */}
        {totalMatches > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevMatch}
              className="p-1.5 rounded-lg text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMatch}
              className="p-1.5 rounded-lg text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Match Summary Indicator */}
      <div className="p-4 text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
        {query ? (
          totalMatches > 0 ? (
            <p>
              Match <span className="font-semibold text-wa-green">{currentMatchNumber}</span> of{' '}
              <span className="font-semibold">{totalMatches}</span> found
            </p>
          ) : (
            <p>No messages match &quot;{query}&quot;</p>
          )
        ) : (
          <p>Search for messages in this chat</p>
        )}
      </div>
    </div>
  );
}
