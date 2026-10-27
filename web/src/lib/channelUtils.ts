/**
 * Utility functions for WhatsApp-style Broadcast Announcement Channels.
 */

/**
 * Normalizes and sanitizes a custom string into a clean URL-friendly slug.
 * e.g. "Tech News & Updates!" -> "tech-news-updates"
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Formats subscriber count nicely (e.g. 1420 -> "1.4K", 1025000 -> "1M")
 */
export function formatSubscriberCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1000000) {
    const k = (count / 1000).toFixed(1).replace(/\.0$/, '');
    return `${k}K`;
  }
  const m = (count / 1000000).toFixed(1).replace(/\.0$/, '');
  return `${m}M`;
}
