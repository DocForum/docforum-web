/** Short relative time for a notification row ("just now", "5 min ago", "3 d ago").
 * Falls back to a stable date for anything older than a week, and to the raw
 * string if the timestamp cannot be parsed — a notification must never render
 * "NaN min ago" or an empty cell. */
export function formatNotificationTime(iso: string, now: Date = new Date()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((now.getTime() - then) / 1000);
  // A server clock slightly ahead of the browser's is not "in 3 seconds".
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;

  return new Date(then).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: new Date(then).getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/** Full timestamp for the `title`/screen-reader text behind a relative time. */
export function formatNotificationTimestamp(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Date(parsed).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
