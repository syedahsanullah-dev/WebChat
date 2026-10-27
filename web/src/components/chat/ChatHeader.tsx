'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import Avatar from '@/components/ui/Avatar';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import TypingDots from './TypingDots';
import { formatLastSeen } from '@/hooks/usePresence';
import { ArrowLeft, Phone, Search, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatHeaderProps {
  name: string;
  avatar?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
  subtitle?: string | null;
  isTyping?: boolean;
  typingUsername?: string | null;
  isE2EE?: boolean;
  isEphemeral?: boolean;
  ephemeralDuration?: number | null;
  onBack: () => void;
  onStartCall: () => void;
  onSearch?: () => void;
  onHeaderClick?: () => void;
  menuItems: DropdownMenuItem[];
}

export default function ChatHeader({
  name,
  avatar,
  isOnline,
  lastSeen,
  subtitle,
  isTyping = false,
  typingUsername,
  isE2EE = true,
  isEphemeral,
  ephemeralDuration,
  onBack,
  onStartCall,
  onSearch,
  onHeaderClick,
  menuItems,
}: ChatHeaderProps) {
  const hasEphemeral = isEphemeral || (ephemeralDuration !== null && ephemeralDuration !== undefined && ephemeralDuration > 0);

  // Determine subtitle status
  const renderStatus = () => {
    if (isTyping) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-wa-green font-medium">
          <span>{typingUsername ? `${typingUsername} is typing` : 'typing'}</span>
          <TypingDots size="sm" />
        </span>
      );
    }

    if (hasEphemeral && !subtitle) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
          <Clock className="w-3 h-3 text-[#00a884]" />
          <span>disappearing messages on</span>
        </span>
      );
    }

    if (subtitle) {
      return (
        <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
          {subtitle}
        </span>
      );
    }

    if (isOnline) {
      return <span className="text-xs text-wa-green font-medium">online</span>;
    }

    if (lastSeen) {
      const formatted = formatLastSeen(lastSeen);
      if (formatted) {
        return (
          <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
            {formatted}
          </span>
        );
      }
    }

    return null;
  };

  return (
    <Header
      leftContent={
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button (<-) */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex md:hidden w-9 h-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary focus:outline-none flex-shrink-0 cursor-pointer"
            aria-label="Back to conversations list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={onHeaderClick}
            className={cn('flex items-center gap-2 sm:gap-3 min-w-0', onHeaderClick && 'cursor-pointer')}
          >
            <Avatar name={name} src={avatar} size="md" isOnline={isOnline} />

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-medium text-sm sm:text-[15px] text-wa-light-text-primary dark:text-wa-dark-text-primary truncate leading-tight">
                  {name}
                </h2>
                {isE2EE && (
                  <span title="End-to-end encrypted" className="text-wa-green flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
                {hasEphemeral && (
                  <span title="Disappearing messages active" className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="h-4 flex items-center leading-none mt-0.5">{renderStatus()}</div>
            </div>
          </div>
        </div>
      }
      rightContent={
        <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2">
          {/* Audio Call Button */}
          <button
            type="button"
            onClick={onStartCall}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
            aria-label="Start voice call"
            title="Voice call (WebRTC audio-only Opus 32kbps)"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={onSearch}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
            aria-label="Search within conversation"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Menu */}
          <DropdownMenu items={menuItems} align="right" />
        </div>
      }
    />
  );
}
