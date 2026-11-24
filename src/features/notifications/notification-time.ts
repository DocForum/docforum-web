import type { useT } from '../../i18n/useT';

type T = ReturnType<typeof useT>;

/** Identity translator: pure callers and unit tests get the English source
 * copy when no `IntlProvider` is in scope; components pass their `t`. */
const english: T = (_id, defaultMessage) => defaultMessage;

/** Short relative time for a notification row ("just now", "5 min ago", "3 d ago").
 * Falls back to a stable date for anything older than a week, and to the raw
 * string if the timestamp cannot be parsed — a notification must never render
 * "NaN min ago" or an empty cell. */
export function formatNotificationTime(iso: string, now: Date = new Date(), t: T = english): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((now.getTime() - then) / 1000);
  // A server clock slightly ahead of the browser's is not "in 3 seconds".
  if (seconds < 60) return t('notifications.time.justNow', 'just now');

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t('notifications.time.minutesAgo', '{count, plural, one {# min ago} other {# min ago}}', {
      count: minutes,
    });
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t('notifications.time.hoursAgo', '{count, plural, one {# h ago} other {# h ago}}', {
      count: hours,
    });
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return t('notifications.time.daysAgo', '{count, plural, one {# d ago} other {# d ago}}', {
      count: days,
    });
  }

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
