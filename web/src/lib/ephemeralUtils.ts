/**
 * Ephemeral / Disappearing Messages Utility
 * Manages duration options and user-friendly formatting.
 */

export const EPHEMERAL_DURATIONS = [
  { value: 86400, label: '24 Hours', description: 'Messages disappear 24 hours after they are sent' },
  { value: 604800, label: '7 Days', description: 'Messages disappear 7 days after they are sent' },
  { value: 7776000, label: '90 Days', description: 'Messages disappear 90 days after they are sent' },
  { value: null, label: 'Off', description: 'Messages stay in this chat forever' },
] as const;

export type EphemeralDurationValue = 86400 | 604800 | 7776000 | null;

/**
 * Returns human-readable label for a duration in seconds.
 */
export function formatEphemeralDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Off';
  if (seconds === 86400) return '24 hours';
  if (seconds === 604800) return '7 days';
  if (seconds === 7776000) return '90 days';

  // Fallback calculations for arbitrary durations
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

/**
 * Generates system announcement text when ephemeral duration is changed.
 */
export function getEphemeralSystemMessageText(
  authorName: string,
  duration: number | null | undefined
): string {
  const isMe = authorName.toLowerCase() === 'you';
  const prefix = isMe ? 'You' : `@${authorName.replace(/^@/, '')}`;

  if (!duration || duration <= 0) {
    return `${prefix} turned off disappearing messages.`;
  }

  const durationStr = formatEphemeralDuration(duration);
  return `${prefix} set disappearing messages to ${durationStr}.`;
}
