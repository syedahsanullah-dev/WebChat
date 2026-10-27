/**
 * Zero-dependency natural language duration and time parser.
 * Converts strings like "10m", "2h", "1d", "tomorrow 9am" into exact Date objects in UTC.
 */
export function parseNaturalTime(timeInput: string): Date | null {
  if (!timeInput || typeof timeInput !== 'string') return null;

  const input = timeInput.trim().toLowerCase();
  const now = new Date();

  // 1. Check relative duration format: 10m, 15min, 2h, 1d
  const relativeMatch = input.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();

    if (isNaN(value) || value <= 0) return null;

    if (unit.startsWith('m')) {
      return new Date(now.getTime() + value * 60 * 1000);
    } else if (unit.startsWith('h')) {
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    } else if (unit.startsWith('d')) {
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    }
  }

  // 2. Check "tomorrow [at] 9am" or "tomorrow [at] 9:30pm" or "tomorrow [at] 14:00"
  const tomorrowMatch = input.match(/^tomorrow(?:\s+at)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (tomorrowMatch) {
    let hours = parseInt(tomorrowMatch[1], 10);
    const minutes = tomorrowMatch[2] ? parseInt(tomorrowMatch[2], 10) : 0;
    const meridiem = tomorrowMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }

  // 3. Check "today [at] 5pm" or "at 5pm"
  const todayMatch = input.match(/^(?:today\s+)?(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (todayMatch) {
    let hours = parseInt(todayMatch[1], 10);
    const minutes = todayMatch[2] ? parseInt(todayMatch[2], 10) : 0;
    const meridiem = todayMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    const targetDate = new Date(now);
    targetDate.setHours(hours, minutes, 0, 0);

    // If the time already passed today, assume tomorrow
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return targetDate;
  }

  return null;
}

/**
 * Formats a Date object into a readable friendly string: "Today at 3:00 PM" or "Tomorrow at 9:00 AM".
 */
export function formatFriendlyTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today at ${timeString}`;
  if (isTomorrow) return `Tomorrow at ${timeString}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeString}`;
}
