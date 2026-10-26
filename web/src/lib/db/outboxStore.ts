import { getLocalDB } from './index';
import type { OutboxQueueItem } from './index';
export type { OutboxQueueItem };

/**
 * Enqueues a message into the local outbox store.
 */
export async function enqueueOutbox(item: OutboxQueueItem): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    await db.put('outbox', item);
  } catch (err) {
    console.debug('[outboxStore] Failed to enqueue message:', err);
  }
}

/**
 * Retrieves all pending messages in FIFO order (by queuedAt ascending).
 */
export async function getPendingOutbox(): Promise<OutboxQueueItem[]> {
  const db = await getLocalDB();
  if (!db) return [];

  try {
    const index = db.transaction('outbox').store.index('by-queued');
    const items = await index.getAll();
    items.sort((a, b) => a.queuedAt - b.queuedAt);
    return items;
  } catch (err) {
    console.debug('[outboxStore] Failed to read outbox items:', err);
    return [];
  }
}

/**
 * Removes a message from the outbox after successful acknowledgment or transmission.
 */
export async function dequeueOutbox(tempId: string): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    await db.delete('outbox', tempId);
  } catch (err) {
    console.debug('[outboxStore] Failed to dequeue outbox item:', err);
  }
}

/**
 * Clears all items from the outbox queue.
 */
export async function clearOutbox(): Promise<void> {
  const db = await getLocalDB();
  if (!db) return;

  try {
    await db.clear('outbox');
  } catch (err) {
    console.debug('[outboxStore] Failed to clear outbox:', err);
  }
}
