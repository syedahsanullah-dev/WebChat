'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { MessageReactionPayload } from '@shared/events';

export function useReactions(chatId?: string | null) {
  const { user } = useAuth();
  const { send, subscribe } = useWebSocket();
  const [reactionsByMessage, setReactionsByMessage] = useState<
    Record<string, Record<string, string[]>>
  >({});

  // Listen for WebSocket reaction events
  useEffect(() => {
    if (!chatId) return;

    const unsub = subscribe<MessageReactionPayload>('message:reaction', (payload) => {
      if (!payload || payload.chatId !== chatId) return;

      const { messageId, emoji, userId, action } = payload;

      setReactionsByMessage((prev) => {
        const currentMsgReactions = { ...(prev[messageId] || {}) };
        const currentUserList = [...(currentMsgReactions[emoji] || [])];

        const isUserIncluded = currentUserList.includes(userId);
        const shouldAdd = action ? action === 'add' : !isUserIncluded;

        if (shouldAdd && !isUserIncluded) {
          currentMsgReactions[emoji] = [...currentUserList, userId];
        } else if (!shouldAdd && isUserIncluded) {
          const filtered = currentUserList.filter((id) => id !== userId);
          if (filtered.length > 0) {
            currentMsgReactions[emoji] = filtered;
          } else {
            delete currentMsgReactions[emoji];
          }
        }

        return {
          ...prev,
          [messageId]: currentMsgReactions,
        };
      });
    });

    return () => {
      unsub();
    };
  }, [chatId, subscribe]);

  // Toggle reaction optimistically and send over WebSocket
  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!chatId || !user) return;

      const userId = user.id;

      setReactionsByMessage((prev) => {
        const currentMsgReactions = { ...(prev[messageId] || {}) };
        const currentUserList = [...(currentMsgReactions[emoji] || [])];
        const isUserIncluded = currentUserList.includes(userId);

        if (isUserIncluded) {
          const filtered = currentUserList.filter((id) => id !== userId);
          if (filtered.length > 0) {
            currentMsgReactions[emoji] = filtered;
          } else {
            delete currentMsgReactions[emoji];
          }
        } else {
          currentMsgReactions[emoji] = [...currentUserList, userId];
        }

        return {
          ...prev,
          [messageId]: currentMsgReactions,
        };
      });

      send({
        type: 'message:reaction',
        payload: {
          chatId,
          messageId,
          userId,
          emoji,
        },
      });
    },
    [chatId, user, send]
  );

  return {
    reactionsByMessage,
    toggleReaction,
  };
}
