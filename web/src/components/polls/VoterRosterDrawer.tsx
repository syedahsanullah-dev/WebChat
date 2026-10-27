'use client';

import React, { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { X, CheckCircle2, Loader2, Users } from 'lucide-react';

export interface VoterDetail {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  votedAt: string;
}

export interface OptionRoster {
  optionId: string;
  text: string;
  orderIdx: number;
  voteCount: number;
  voters: VoterDetail[];
}

export interface VoterRosterDrawerProps {
  pollId: string;
  question: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoterRosterDrawer({
  pollId,
  question,
  isOpen,
  onClose,
}: VoterRosterDrawerProps) {
  const [options, setOptions] = useState<OptionRoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !pollId) return;

    let mounted = true;
    async function fetchRoster() {
      try {
        setLoading(true);
        const res = await fetch(`/api/polls/${pollId}/results`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.options)) {
            setOptions(data.options);
          }
        }
      } catch (err) {
        console.error('Failed to load voter roster:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRoster();
    return () => {
      mounted = false;
    };
  }, [isOpen, pollId]);

  if (!isOpen) return null;

  const totalVoters = options.reduce((sum, o) => sum + o.voters.length, 0);

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-wa-light-sidebar dark:bg-[#111b21] border-l border-[#e9edef] dark:border-white/10 z-50 shadow-2xl flex flex-col animate-slideLeft select-none">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-[#e9edef] dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00a884]" />
          <h3 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Poll Details
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-muted hover:text-wa-light-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Question Header Card */}
      <div className="p-4 bg-wa-light-hover/40 dark:bg-white/5 border-b border-[#e9edef] dark:border-white/10 space-y-1">
        <h4 className="font-bold text-sm text-wa-light-text-primary dark:text-white leading-snug">
          {question}
        </h4>
        <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
          {totalVoters} {totalVoters === 1 ? 'vote cast' : 'total votes cast'}
        </p>
      </div>

      {/* Options & Voters List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-[#00a884] animate-spin" />
            <span className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Loading votes...
            </span>
          </div>
        ) : options.length === 0 ? (
          <div className="py-8 text-center text-xs text-wa-light-text-muted">
            No votes recorded yet.
          </div>
        ) : (
          options.map((option) => (
            <div key={option.optionId} className="space-y-2">
              {/* Option Title Banner */}
              <div className="flex items-center justify-between text-xs font-semibold px-2 py-1 rounded-md bg-black/5 dark:bg-white/5">
                <span className="text-wa-light-text-primary dark:text-white truncate">
                  {option.text}
                </span>
                <span className="text-[#00a884] shrink-0 ml-2">
                  {option.voteCount} {option.voteCount === 1 ? 'vote' : 'votes'}
                </span>
              </div>

              {/* Voters List for this Option */}
              {option.voters.length === 0 ? (
                <p className="text-[11px] text-wa-light-text-muted italic px-2">
                  No votes for this option
                </p>
              ) : (
                <div className="space-y-1.5 pl-1">
                  {option.voters.map((voter) => (
                    <div
                      key={voter.userId}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={voter.avatarUrl}
                          name={voter.displayName || voter.username}
                          size="sm"
                        />
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-medium text-wa-light-text-primary dark:text-white truncate">
                            {voter.displayName || voter.username}
                          </span>
                          <span className="text-[10px] text-wa-light-text-muted truncate">
                            @{voter.username}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-wa-light-text-muted shrink-0 ml-2">
                        {new Date(voter.votedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
