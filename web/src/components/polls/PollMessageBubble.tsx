'use client';

import React, { useState } from 'react';
import { PollPayload } from '@shared/types';
import { usePollVote } from '@/hooks/usePollVote';
import PollOptionRow from './PollOptionRow';
import VoterRosterDrawer from './VoterRosterDrawer';
import { BarChart2, Users } from 'lucide-react';

export interface PollMessageBubbleProps {
  initialPoll: PollPayload;
  currentUserId: string;
}

export default function PollMessageBubble({
  initialPoll,
  currentUserId,
}: PollMessageBubbleProps) {
  const { poll, castVote, isVoting } = usePollVote(initialPoll, currentUserId);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  return (
    <div className="w-full max-w-sm rounded-2xl p-3 sm:p-3.5 bg-wa-light-bubble-in dark:bg-[#202c33] border border-black/5 dark:border-white/10 shadow-sm space-y-3 select-none">
      {/* Top Header: Question and Subtitle */}
      <div className="space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-sm sm:text-base text-wa-light-text-primary dark:text-white leading-snug break-words">
            {poll.question}
          </h4>
          <BarChart2 className="w-4 h-4 text-[#00a884] shrink-0 mt-0.5" />
        </div>
        <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center gap-1">
          <span>{poll.allowMultiple ? 'Select one or more' : 'Select one'}</span>
          <span>&bull;</span>
          <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
        </p>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option) => (
          <PollOptionRow
            key={option.id}
            option={option}
            allowMultiple={poll.allowMultiple}
            isClosed={poll.isClosed}
            onSelect={castVote}
          />
        ))}
      </div>

      {/* Bottom Footer: "View votes" action */}
      <div className="pt-1 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsRosterOpen(true)}
          className="text-xs font-semibold text-[#00a884] hover:text-[#008f6f] transition-colors flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Users className="w-3.5 h-3.5" />
          <span>View votes</span>
        </button>
        {poll.isClosed && (
          <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
            Closed
          </span>
        )}
      </div>

      {/* Slide-over Voter Roster Drawer */}
      <VoterRosterDrawer
        pollId={poll.id}
        question={poll.question}
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
      />
    </div>
  );
}
