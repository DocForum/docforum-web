/** How long the oldest item in a queue has been waiting. Pure and
 * clock-injected so the boundary cases are testable. */
export function formatAge(oldestAt: string | null, now: Date): string {
  if (!oldestAt) return 'Nothing waiting';
  const then = Date.parse(oldestAt);
  if (Number.isNaN(then)) return 'Age unavailable';

  const minutes = Math.floor((now.getTime() - then) / 60_000);
  if (minutes < 1) return 'Just arrived';
  if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}
