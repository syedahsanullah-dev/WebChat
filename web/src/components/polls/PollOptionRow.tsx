'use client';

import React from 'react';
import { PollOptionPayload } from '@shared/types';
import { Check, CheckSquare, Square, Circle } from 'lucide-react';

export interface PollOptionRowProps {
  option: PollOptionPayload;
  allowMultiple: boolean;
  isClosed?: boolean;
  onSelect: (optionId: string) => void;
}

export default function PollOptionRow({
  option,
  allowMultiple,
  isClosed,
  onSelect,
}: PollOptionRowProps) {
  const percentage = option.percentage ?? 0;
  const isSelected = Boolean(option.hasVoted);

  return (
    <div
      onClick={() => {
        if (!isClosed) onSelect(option.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isClosed) {
          e.preventDefault();
          onSelect(option.id);
        }
      }}
      className={`relative overflow-hidden w-full p-2.5 rounded-xl border transition-all select-none cursor-pointer flex items-center justify-between gap-3 ${
        isSelected
          ? 'border-[#00a884] bg-[#00a884]/5 dark:bg-[#00a884]/10'
          : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-black/5 dark:bg-white/5'
      }`}
    >
      {/* Animated Green Percentage Progress Fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-[#00a884]/20 dark:bg-[#00a884]/25 transition-all duration-300 ease-out pointer-events-none rounded-xl"
        style={{ width: `${percentage}%` }}
      />

      {/* Left: Radio or Checkbox icon + Option text */}
      <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1">
        <div className="shrink-0 flex items-center justify-center">
          {allowMultiple ? (
            isSelected ? (
              <div className="w-4 h-4 rounded bg-[#00a884] flex items-center justify-center text-white">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
            )
          ) : isSelected ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#00a884] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#00a884]" />
            </div>
          ) : (
            <Circle className="w-4 h-4 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
          )}
        </div>

        <span
          className={`text-xs sm:text-sm font-medium truncate ${
            isSelected
              ? 'text-wa-light-text-primary dark:text-white font-semibold'
              : 'text-wa-light-text-primary dark:text-wa-dark-text-primary'
          }`}
        >
          {option.text}
        </span>
      </div>

      {/* Right: Vote count and percentage */}
      <div className="relative z-10 shrink-0 flex items-center gap-2 text-right">
        {/* Voter small avatars preview if present */}
        {option.voterAvatars && option.voterAvatars.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden">
            {option.voterAvatars.slice(0, 3).map((url, i) => (
              <img
                key={i}
                src={url}
                alt="voter"
                className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-[#202c33] object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-wa-light-text-primary dark:text-white">
            {option.voteCount}
          </span>
          <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
