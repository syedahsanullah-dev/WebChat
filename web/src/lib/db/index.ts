import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  content: string | null;
  messageType: string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  replyToId?: string | null;
  isDeleted?: boolean;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | string;
  createdAt: string;
  tempId?: string;
}

export interface OutboxQueueItem {
  tempId: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  replyToMessageId?: string | null;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  queuedAt: number;
}

export interface CachedChat {
  id: string;
  name?: string | null;
  isGroup: boolean;
  lastMessageSnippet?: string;
  updatedAt: string;
}

export interface WebChatDB extends DBSchema {
  messages: {
    key: string; // messageId or tempId
    value: CachedMessage;
    indexes: {
      'by-chat': string;
      'by-created': string;
    };
  };
  outbox: {
    key: string; // tempId
    value: OutboxQueueItem;
    indexes: {
      'by-queued': number;
    };
  };
  chats: {
    key: string; // chatId
    value: CachedChat;
    indexes: {
      'by-updated': string;
    };
  };
}

const DB_NAME = 'webchat_local_cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WebChatDB>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<WebChatDB>> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<WebChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Messages object store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-chat', 'chatId');
          msgStore.createIndex('by-created', 'createdAt');
        }

        // 2. Outbox object store (FIFO queue)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'tempId' });
          outboxStore.createIndex('by-queued', 'queuedAt');
        }

        // 3. Chats cache store
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }

  return dbPromise;
}
