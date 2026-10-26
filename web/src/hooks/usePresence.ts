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
    // 0. Subscribe to presence:init (initial snapshot from server #2 on connect)
    const unsubInit = subscribe<{ onlineUserIds: string[] }>('presence:init', (payload) => {
      if (!payload?.onlineUserIds) return;
      const onlineSet = new Set(payload.onlineUserIds);
      setPresenceMap((prev) => {
        const next: Record<string, PresenceInfo> = {};
        Object.keys(prev).forEach((uid) => {
          next[uid] = {
            isOnline: onlineSet.has(uid),
            lastSeen: onlineSet.has(uid) ? undefined : prev[uid]?.lastSeen,
          };
        });
        payload.onlineUserIds.forEach((uid) => {
          next[uid] = {
            isOnline: true,
            lastSeen: undefined,
          };
        });
        return next;
      });
    });

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
      unsubInit();
      unsubOnline();
      unsubOffline();
    };
  }, [subscribe]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      if (!userId) return false;
      const cleanId = userId.replace(/^@/, '');
      return presenceMap[userId]?.isOnline ?? presenceMap[cleanId]?.isOnline ?? false;
    },
    [presenceMap]
  );

  const getUserLastSeen = useCallback(
    (userId: string): string | undefined => {
      if (!userId) return undefined;
      const cleanId = userId.replace(/^@/, '');
      return presenceMap[userId]?.lastSeen || presenceMap[cleanId]?.lastSeen;
    },
    [presenceMap]
  );

  const getPresenceStatusText = useCallback(
    (userId: string, defaultOnline?: boolean, defaultLastSeen?: string | null): string => {
      const presence = presenceMap[userId] || presenceMap[userId.replace(/^@/, '')];
      const isOnline = presence !== undefined ? presence.isOnline : false;
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
