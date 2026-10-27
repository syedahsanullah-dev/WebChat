'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { PollPayload, PollOptionPayload } from '@shared/types';
import { PollUpdatePayload } from '@shared/events';

export function usePollVote(initialPoll: PollPayload, currentUserId: string) {
  const { send, subscribe } = useWebSocket();
  const [poll, setPoll] = useState<PollPayload>(initialPoll);
  const [isVoting, setIsVoting] = useState(false);

  // Sync state if initialPoll changes from props
  useEffect(() => {
    setPoll(initialPoll);
  }, [initialPoll]);

  // Subscribe to real-time poll:update WebSocket events
  useEffect(() => {
    const unsubscribe = subscribe('poll:update', (payload: PollUpdatePayload) => {
      if (payload.pollId !== poll.id) return;

      setPoll((prev) => {
        const updatedOptions: PollOptionPayload[] = prev.options.map((opt) => {
          const match = payload.options.find((o) => o.id === opt.id);
          if (!match) return opt;
          return {
            ...opt,
            voteCount: match.voteCount,
            percentage: match.percentage,
            hasVoted: match.voterIds.includes(currentUserId),
          };
        });

        const userHasVoted = updatedOptions.some((o) => o.hasVoted);

        return {
          ...prev,
          totalVotes: payload.totalVotes,
          options: updatedOptions,
          hasVoted: userHasVoted,
        };
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [poll.id, currentUserId, subscribe]);

  const castVote = useCallback(
    async (optionId: string) => {
      if (poll.isClosed || isVoting) return;

      // 1. Optimistic UI update
      setPoll((prev) => {
        const option = prev.options.find((o) => o.id === optionId);
        if (!option) return prev;

        const isCurrentlyVoted = Boolean(option.hasVoted);

        let newOptions: PollOptionPayload[];

        if (!prev.allowMultiple) {
          // Single-choice: unselect all others, toggle target
          newOptions = prev.options.map((opt) => {
            if (opt.id === optionId) {
              const newHasVoted = !isCurrentlyVoted;
              const diff = newHasVoted ? 1 : (isCurrentlyVoted ? -1 : 0);
              return {
                ...opt,
                hasVoted: newHasVoted,
                voteCount: Math.max(0, opt.voteCount + diff),
              };
            }
            if (opt.hasVoted) {
              return {
                ...opt,
                hasVoted: false,
                voteCount: Math.max(0, opt.voteCount - 1),
              };
            }
            return opt;
          });
        } else {
          // Multi-choice: toggle target only
          newOptions = prev.options.map((opt) => {
            if (opt.id === optionId) {
              const newHasVoted = !isCurrentlyVoted;
              const diff = newHasVoted ? 1 : -1;
              return {
                ...opt,
                hasVoted: newHasVoted,
                voteCount: Math.max(0, opt.voteCount + diff),
              };
            }
            return opt;
          });
        }

        const newTotal = newOptions.reduce((acc, o) => acc + o.voteCount, 0);
        const optionsWithPercentage = newOptions.map((o) => ({
          ...o,
          percentage: newTotal > 0 ? Math.round((o.voteCount / newTotal) * 100) : 0,
        }));

        return {
          ...prev,
          totalVotes: newTotal,
          options: optionsWithPercentage,
          hasVoted: optionsWithPercentage.some((o) => o.hasVoted),
        };
      });

      // 2. Dispatch via WebSocket for sub-10ms delivery
      try {
        setIsVoting(true);
        send({
          type: 'poll:vote',
          payload: {
            pollId: poll.id,
            optionId,
            chatId: poll.chatId,
          },
        });

        // 3. REST API fallback ensuring persistence
        await fetch(`/api/polls/${poll.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ optionId }),
        });
      } catch (err) {
        console.error('Failed to register poll vote:', err);
      } finally {
        setIsVoting(false);
      }
    },
    [poll.id, poll.chatId, poll.isClosed, poll.allowMultiple, isVoting, send]
  );

  return {
    poll,
    castVote,
    isVoting,
  };
}
