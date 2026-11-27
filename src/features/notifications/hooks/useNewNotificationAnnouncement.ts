import { useEffect, useRef } from 'react';
import { useAnnouncer } from '../../../hooks/useAnnouncer';

/** Text read out when the unread count goes up. Count only: titles can be clinical. */
export function newNotificationsMessage(added: number, unread: number): string {
  const what = added === 1 ? '1 new notification' : `${added} new notifications`;
  return `${what}. ${unread} unread.`;
}

interface Options {
  /** Server unread count, as shown on the bell. */
  unreadCount: number;
  /** False until the first page has loaded; nothing is announced before that. */
  ready: boolean;
  /** Changes when the signed-in account or acting-for profile changes. */
  resetKey: string | null;
  /** Batching window; defaults to `useAnnouncer`'s. */
  batchMs?: number;
}

/**
 * Polite announcement for newly arrived notifications (issue #246, WCAG 4.1.3).
 *
 * - The count on first load is the baseline and is never announced.
 * - Only increases are announced. A decrease (mark read, mark all read) just
 *   moves the baseline down.
 * - Increases inside one batching window are announced once, as the total
 *   added since the last announcement ("3 new notifications").
 * - A new account or profile starts over with a fresh baseline.
 *
 * Quiet hours (#108) are applied by docforum-core when it delivers a
 * notification, so anything that reaches the inbox was meant to be seen now.
 * The client doesn't apply them a second time.
 *
 * Returns the message to render in a permanently mounted polite live region.
 */
export function useNewNotificationAnnouncement({ unreadCount, ready, resetKey, batchMs }: Options): string {
  const { message, announce, reset } = useAnnouncer(batchMs);
  const baseline = useRef<number | null>(null);
  const latest = useRef(unreadCount);
  const key = useRef(resetKey);

  useEffect(() => {
    latest.current = unreadCount;

    if (key.current !== resetKey) {
      key.current = resetKey;
      baseline.current = null;
      reset();
    }

    if (!ready) return;

    if (baseline.current === null || unreadCount <= baseline.current) {
      baseline.current = unreadCount;
      return;
    }

    // Resolved when the batch flushes, so a burst becomes one message about
    // everything that arrived since the last announcement.
    announce(() => {
      const from = baseline.current;
      const to = latest.current;
      if (from === null || to <= from) return '';
      baseline.current = to;
      return newNotificationsMessage(to - from, to);
    });
  }, [unreadCount, ready, resetKey, announce, reset]);

  return message;
}
