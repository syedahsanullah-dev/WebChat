import { getLocalDB } from './index';
import type { CachedMessage } from './index';
export type { CachedMessage };

/**
 * Persists an array of messages to the local IndexedDB cache in a single transaction.
 */
export async function cacheMessages(messages: CachedMessage[]): Promise<void> {
  const db = await getLocalDB();
  if (!db || messages.length === 0) return;

  try {
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all([
      ...messages.map((msg) => tx.store.put(msg)),
      tx.done,
    ]);
  } catch (err) {
    console.debug('[messageStore] Failed to cache messages in IndexedDB:', err);
  }
}

/**
 * Persists a single message to the local IndexedDB cache.
 */
export async function cacheSingleMessage(msg: CachedMessage): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    await db.put('messages', msg);
  } catch (err) {
    console.debug('[messageStore] Failed to put message in IndexedDB:', err);
  }
}

/**
 * Retrieves all cached messages for a chat, sorted chronologically.
 */
export async function getCachedMessages(chatId: string, limit: number = 100): Promise<CachedMessage[]> {
  const db = await getLocalDB();
  if (!db) return [];

  try {
    const index = db.transaction('messages').store.index('by-chat');
    const all = await index.getAll(chatId);

    // Sort by createdAt ascending
    all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (all.length > limit) {
      return all.slice(all.length - limit);
    }
    return all;
  } catch (err) {
    console.debug('[messageStore] Failed to read cached messages:', err);
    return [];
  }
}

/**
 * Updates a cached message's status and optionally transitions from temporary ID to permanent server UUID.
 */
export async function updateCachedMessageStatus(
  id: string,
  newStatus: string,
  permanentId?: string
): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    const existing = await db.get('messages', id);
    if (!existing) return;

    if (permanentId && permanentId !== id) {
      // Remove temporary entry and store with permanent ID
      await db.delete('messages', id);
      await db.put('messages', {
        ...existing,
        id: permanentId,
        tempId: id,
        status: newStatus,
      });
    } else {
      await db.put('messages', {
        ...existing,
        status: newStatus,
      });
    }
  } catch (err) {
    console.debug('[messageStore] Failed to update message status:', err);
  }
}

/**
 * Deletes a cached message by ID.
 */
export async function deleteCachedMessage(id: string): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    await db.delete('messages', id);
  } catch (err) {
    console.debug('[messageStore] Failed to delete message from cache:', err);
  }
}
