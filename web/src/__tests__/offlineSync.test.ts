import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory mock database for IndexedDB
const mockMessagesStore = new Map<string, any>();
const mockOutboxStore = new Map<string, any>();
const mockChatsStore = new Map<string, any>();

vi.mock('@/lib/db/index', () => {
  return {
    getLocalDB: vi.fn(async () => {
      return {
        transaction: (storeName: string, mode?: string) => {
          const storeMap =
            storeName === 'messages'
              ? mockMessagesStore
              : storeName === 'outbox'
              ? mockOutboxStore
              : mockChatsStore;

          return {
            store: {
              put: async (val: any) => {
                const key = val.id || val.tempId;
                storeMap.set(key, val);
                return key;
              },
              index: (_idxName: string) => ({
                getAll: async (filterVal?: any) => {
                  const items = Array.from(storeMap.values());
                  if (filterVal !== undefined) {
                    return items.filter((item) => item.chatId === filterVal);
                  }
                  return items;
                },
              }),
            },
            done: Promise.resolve(),
          };
        },
        put: async (storeName: string, val: any) => {
          const storeMap =
            storeName === 'messages'
              ? mockMessagesStore
              : storeName === 'outbox'
              ? mockOutboxStore
              : mockChatsStore;
          const key = val.id || val.tempId;
          storeMap.set(key, val);
          return key;
        },
        get: async (storeName: string, key: string) => {
          const storeMap =
            storeName === 'messages'
              ? mockMessagesStore
              : storeName === 'outbox'
              ? mockOutboxStore
              : mockChatsStore;
          return storeMap.get(key);
        },
        delete: async (storeName: string, key: string) => {
          const storeMap =
            storeName === 'messages'
              ? mockMessagesStore
              : storeName === 'outbox'
              ? mockOutboxStore
              : mockChatsStore;
          storeMap.delete(key);
        },
        clear: async (storeName: string) => {
          const storeMap =
            storeName === 'messages'
              ? mockMessagesStore
              : storeName === 'outbox'
              ? mockOutboxStore
              : mockChatsStore;
          storeMap.clear();
        },
      };
    }),
  };
});

import {
  cacheMessages,
  cacheSingleMessage,
  getCachedMessages,
  updateCachedMessageStatus,
  deleteCachedMessage,
} from '@/lib/db/messageStore';
import {
  enqueueOutbox,
  getPendingOutbox,
  dequeueOutbox,
  clearOutbox,
} from '@/lib/db/outboxStore';

describe('Phase 24: Local-First Offline Sync & IndexedDB Message Queue', () => {
  beforeEach(() => {
    mockMessagesStore.clear();
    mockOutboxStore.clear();
    mockChatsStore.clear();
  });

  describe('1. messageStore (Local Caching)', () => {
    it('caches and retrieves messages for a chat sorted chronologically', async () => {
      const msgs = [
        {
          id: 'msg-2',
          chatId: 'chat-1',
          senderId: 'user-1',
          content: 'Second message',
          messageType: 'text',
          status: 'sent',
          createdAt: '2026-10-27T10:05:00.000Z',
        },
        {
          id: 'msg-1',
          chatId: 'chat-1',
          senderId: 'user-2',
          content: 'First message',
          messageType: 'text',
          status: 'sent',
          createdAt: '2026-10-27T10:00:00.000Z',
        },
      ];

      await cacheMessages(msgs);
      const cached = await getCachedMessages('chat-1');

      expect(cached).toHaveLength(2);
      expect(cached[0].id).toBe('msg-1');
      expect(cached[1].id).toBe('msg-2');
    });

    it('caches a single optimistic message', async () => {
      await cacheSingleMessage({
        id: 'temp-123',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Optimistic text',
        messageType: 'text',
        status: 'pending',
        createdAt: '2026-10-27T10:10:00.000Z',
      });

      const cached = await getCachedMessages('chat-1');
      expect(cached).toHaveLength(1);
      expect(cached[0].status).toBe('pending');
      expect(cached[0].content).toBe('Optimistic text');
    });

    it('updates message status and replaces tempId with permanentId on ack', async () => {
      await cacheSingleMessage({
        id: 'temp-123',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Pending message',
        messageType: 'text',
        status: 'pending',
        createdAt: '2026-10-27T10:10:00.000Z',
      });

      await updateCachedMessageStatus('temp-123', 'sent', 'uuid-permanent-456');

      const cached = await getCachedMessages('chat-1');
      expect(cached).toHaveLength(1);
      expect(cached[0].id).toBe('uuid-permanent-456');
      expect(cached[0].status).toBe('sent');
      expect(cached[0].tempId).toBe('temp-123');
    });

    it('deletes message from cache', async () => {
      await cacheSingleMessage({
        id: 'msg-del',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Delete me',
        messageType: 'text',
        status: 'sent',
        createdAt: '2026-10-27T10:10:00.000Z',
      });

      await deleteCachedMessage('msg-del');
      const cached = await getCachedMessages('chat-1');
      expect(cached).toHaveLength(0);
    });
  });

  describe('2. outboxStore (FIFO Offline Queue)', () => {
    it('enqueues messages and returns them in FIFO order by queuedAt', async () => {
      await enqueueOutbox({
        tempId: 'temp-2',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Second queued',
        messageType: 'text',
        queuedAt: 2000,
      });

      await enqueueOutbox({
        tempId: 'temp-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'First queued',
        messageType: 'text',
        queuedAt: 1000,
      });

      const pending = await getPendingOutbox();
      expect(pending).toHaveLength(2);
      expect(pending[0].tempId).toBe('temp-1');
      expect(pending[1].tempId).toBe('temp-2');
    });

    it('dequeues an acknowledged message from outbox', async () => {
      await enqueueOutbox({
        tempId: 'temp-ack',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Ack me',
        messageType: 'text',
        queuedAt: 1000,
      });

      expect(await getPendingOutbox()).toHaveLength(1);

      await dequeueOutbox('temp-ack');
      expect(await getPendingOutbox()).toHaveLength(0);
    });

    it('clears all items from outbox', async () => {
      await enqueueOutbox({
        tempId: 't1',
        chatId: 'c1',
        senderId: 'u1',
        content: '1',
        messageType: 'text',
        queuedAt: 1,
      });
      await enqueueOutbox({
        tempId: 't2',
        chatId: 'c1',
        senderId: 'u1',
        content: '2',
        messageType: 'text',
        queuedAt: 2,
      });

      await clearOutbox();
      expect(await getPendingOutbox()).toHaveLength(0);
    });
  });
});
