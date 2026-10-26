'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useWebSocket } from '@/context/WebSocketContext';
import { getPendingOutbox, dequeueOutbox, OutboxQueueItem } from '@/lib/db/outboxStore';
import { updateCachedMessageStatus } from '@/lib/db/messageStore';

export interface UseOfflineSyncReturn {
  isSyncing: boolean;
  syncedCount: number;
  clearSyncedToast: () => void;
  triggerSync: () => Promise<number>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const { isOnline, isSocketConnected } = useNetworkStatus();
  const { send, subscribe } = useWebSocket();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Subscribe to message:ack to dequeue from outbox
  useEffect(() => {
    const unsub = subscribe<any>('message:ack', async (payload) => {
      if (!payload?.tempId) return;
      try {
        await dequeueOutbox(payload.tempId);
        if (payload.messageId) {
          await updateCachedMessageStatus(payload.tempId, payload.status || 'sent', payload.messageId);
        }
      } catch (err) {
        console.debug('[useOfflineSync] Error cleaning outbox on ack:', err);
      }
    });

    return () => {
      unsub();
    };
  }, [subscribe]);

  const triggerSync = useCallback(async (): Promise<number> => {
    if (isSyncingRef.current || !isOnline || !isSocketConnected) {
      return 0;
    }

    try {
      const pendingItems = await getPendingOutbox();
      if (pendingItems.length === 0) return 0;

      isSyncingRef.current = true;
      setIsSyncing(true);

      let processed = 0;

      for (const item of pendingItems) {
        // Sequentially flush outbox items in FIFO order
        const sent = send({
          type: 'message:send',
          payload: {
            tempId: item.tempId,
            chatId: item.chatId,
            content: item.content,
            messageType: item.messageType,
            mediaUrl: item.mediaUrl || undefined,
            fileUrl: item.mediaUrl || undefined,
            mediaSize: item.mediaSize || undefined,
            mediaDuration: item.mediaDuration || undefined,
            replyToId: item.replyToMessageId || undefined,
            isE2EE: item.isE2EE,
            e2eeIv: item.e2eeIv || undefined,
          },
        });

        if (sent) {
          processed++;
        }
      }

      if (processed > 0) {
        setSyncedCount(processed);
      }

      return processed;
    } catch (err) {
      console.warn('[useOfflineSync] Error during offline sync:', err);
      return 0;
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, isSocketConnected, send]);

  // Automatically trigger sync when coming back online and socket is connected
  useEffect(() => {
    if (isOnline && isSocketConnected) {
      triggerSync();
    }
  }, [isOnline, isSocketConnected, triggerSync]);

  const clearSyncedToast = useCallback(() => {
    setSyncedCount(0);
  }, []);

  return {
    isSyncing,
    syncedCount,
    clearSyncedToast,
    triggerSync,
  };
}
