'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { UserOnlinePayload, UserOfflinePayload } from '@shared/events';
import { format, isToday, isYesterday, differenceInSeconds } from 'date-fns';

export interface PresenceInfo {
  isOnline: boolean;
  lastSeen?: string;
}

export function formatLastSeen(lastSeen?: string | Date | null): string {
  if (!lastSeen) return '';

  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  if (isNaN(date.getTime())) return '';

  const secondsAgo = differenceInSeconds(new Date(), date);
  if (secondsAgo < 60 && secondsAgo >= 0) {
    return 'last seen just now';
  }

  const timeStr = format(date, 'h:mm a');

  if (isToday(date)) {
    return `last seen today at ${timeStr}`;
  }

  if (isYesterday(date)) {
    return `last seen yesterday at ${timeStr}`;
  }

  return `last seen ${format(date, 'dd/MM/yyyy')} at ${timeStr}`;
}

export function usePresence() {
  const { subscribe } = useWebSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceInfo>>({});

  useEffect(() => {
    // 1. Subscribe to user:online
    const unsubOnline = subscribe<UserOnlinePayload>('user:online', (payload) => {
      if (!payload?.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: {
          isOnline: true,
          lastSeen: undefined,
        },
      }));
    });

    // 2. Subscribe to user:offline
    const unsubOffline = subscribe<UserOfflinePayload>('user:offline', (payload) => {
      if (!payload?.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: {
          isOnline: false,
          lastSeen: payload.lastSeen || new Date().toISOString(),
        },
      }));
    });

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [subscribe]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return presenceMap[userId]?.isOnline ?? false;
    },
    [presenceMap]
  );

  const getUserLastSeen = useCallback(
    (userId: string): string | undefined => {
      return presenceMap[userId]?.lastSeen;
    },
    [presenceMap]
  );

  const getPresenceStatusText = useCallback(
    (userId: string, defaultOnline?: boolean, defaultLastSeen?: string | null): string => {
      const presence = presenceMap[userId];
      const isOnline = presence !== undefined ? presence.isOnline : (defaultOnline ?? false);
      const lastSeen = presence !== undefined ? presence.lastSeen : defaultLastSeen;

      if (isOnline) {
        return 'online';
      }

      if (lastSeen) {
        return formatLastSeen(lastSeen);
      }

      return '';
    },
    [presenceMap]
  );

  const setInitialPresence = useCallback(
    (users: Array<{ id: string; isOnline?: boolean; lastSeen?: string | Date | null }>) => {
      setPresenceMap((prev) => {
        const next = { ...prev };
        users.forEach((u) => {
          if (!next[u.id]) {
            next[u.id] = {
              isOnline: Boolean(u.isOnline),
              lastSeen: u.lastSeen ? new Date(u.lastSeen).toISOString() : undefined,
            };
          }
        });
        return next;
      });
    },
    []
  );

  return {
    presenceMap,
    isUserOnline,
    getUserLastSeen,
    getPresenceStatusText,
    setInitialPresence,
    formatLastSeen,
  };
}
