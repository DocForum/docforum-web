// Pure cache transforms for the notification inbox (issue #107).
//
// Keeping them free of React and of the QueryClient means the tricky parts —
// de-duplicating a live event against the page that already contains it, and
// keeping the badge count consistent across pages and tabs — are unit-testable
// on plain data.
import type {
  Notification,
  NotificationPage,
  NotificationStreamEvent,
} from '../../types/models';

/** Shape of the infinite-query data for the inbox. Mirrors React Query's
 * `InfiniteData<NotificationPage>`. */
export interface NotificationPages {
  pages: NotificationPage[];
  pageParams: unknown[];
}

/** Total unread reported by the server for the newest page. The badge must not
 * be computed by counting loaded rows: it would shrink as pages load. */
export function unreadCountFrom(pages: NotificationPages | undefined): number {
  return pages?.pages[0]?.unreadCount ?? 0;
}

export function notificationsFrom(pages: NotificationPages | undefined): Notification[] {
  return pages?.pages.flatMap((page) => page.items) ?? [];
}

function withUnreadCount(page: NotificationPage, unreadCount: number): NotificationPage {
  return { ...page, unreadCount: Math.max(0, unreadCount) };
}

/** Insert a new notification at the top, de-duplicated by id.
 *
 * A live event can race the refetch that already fetched it, so a duplicate is
 * expected — the newer copy (from the stream) wins without duplicating the row
 * or double-counting the badge. */
export function prependNotification(
  pages: NotificationPages | undefined,
  notification: Notification,
  unreadCount?: number,
): NotificationPages | undefined {
  if (!pages || pages.pages.length === 0) return pages;

  const [first, ...rest] = pages.pages;
  const alreadyThere = first.items.some((item) => item.id === notification.id);
  const items = alreadyThere
    ? first.items.map((item) => (item.id === notification.id ? notification : item))
    : [notification, ...first.items];

  const nextUnread = unreadCount ?? first.unreadCount + (notification.readAt === null && !alreadyThere ? 1 : 0);

  return {
    ...pages,
    pages: [
      withUnreadCount({ ...first, items }, nextUnread),
      // Later pages carry the same server total; update it so a refetch of the
      // oldest page cannot resurrect a stale badge.
      ...rest.map((page) => withUnreadCount(page, nextUnread)),
    ],
  };
}

/** Mark one notification read in every loaded page. */
export function markOneRead(
  pages: NotificationPages | undefined,
  notificationId: string,
  readAt: string,
  unreadCount?: number,
): NotificationPages | undefined {
  if (!pages) return pages;

  let changed = false;
  const nextPages = pages.pages.map((page) => {
    const items = page.items.map((item) => {
      if (item.id !== notificationId || item.readAt !== null) return item;
      changed = true;
      return { ...item, readAt };
    });
    return { ...page, items };
  });

  if (!changed) return pages;

  const currentUnread = unreadCountFrom(pages);
  const nextUnread = unreadCount ?? Math.max(0, currentUnread - 1);
  return {
    ...pages,
    pages: nextPages.map((page) => withUnreadCount(page, nextUnread)),
  };
}

/** Mark every loaded notification read (server total goes to 0). */
export function markAllRead(
  pages: NotificationPages | undefined,
  readAt: string,
): NotificationPages | undefined {
  if (!pages) return pages;
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      unreadCount: 0,
      items: page.items.map((item) => (item.readAt === null ? { ...item, readAt } : item)),
    })),
  };
}

/** Apply a live SSE event (or the equivalent cross-tab broadcast) to the cache. */
export function applyStreamEvent(
  pages: NotificationPages | undefined,
  event: NotificationStreamEvent,
  now: string = new Date().toISOString(),
): NotificationPages | undefined {
  switch (event.type) {
    case 'notification':
      return prependNotification(pages, event.notification, event.unreadCount);
    case 'read': {
      if (!pages) return pages;
      const ids = new Set(event.notificationIds);
      return {
        ...pages,
        pages: pages.pages.map((page) => ({
          ...page,
          unreadCount: event.unreadCount,
          items: page.items.map((item) =>
            ids.has(item.id) && item.readAt === null ? { ...item, readAt: now } : item,
          ),
        })),
      };
    }
    default:
      return pages;
  }
}

/** Parse an SSE `data:` payload defensively. A malformed or unknown event is
 * ignored rather than thrown: one bad message must not tear down the stream. */
export function parseStreamEvent(raw: string): NotificationStreamEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as { type?: unknown };

    if (candidate.type === 'notification') {
      const event = parsed as {
        notification?: Partial<Notification>;
        unreadCount?: unknown;
      };
      const notification = event.notification;
      if (!notification || typeof notification.id !== 'string' || typeof notification.title !== 'string') {
        return null;
      }
      return {
        type: 'notification',
        unreadCount: typeof event.unreadCount === 'number' ? event.unreadCount : 0,
        notification: {
          id: notification.id,
          kind: typeof notification.kind === 'string' ? notification.kind : 'unknown',
          title: notification.title,
          body: typeof notification.body === 'string' ? notification.body : '',
          link: typeof notification.link === 'string' ? notification.link : null,
          readAt: typeof notification.readAt === 'string' ? notification.readAt : null,
          createdAt:
            typeof notification.createdAt === 'string'
              ? notification.createdAt
              : new Date().toISOString(),
        },
      };
    }

    if (candidate.type === 'read') {
      const event = parsed as { notificationIds?: unknown; unreadCount?: unknown };
      if (!Array.isArray(event.notificationIds)) return null;
      return {
        type: 'read',
        notificationIds: event.notificationIds.filter((id): id is string => typeof id === 'string'),
        unreadCount: typeof event.unreadCount === 'number' ? event.unreadCount : 0,
      };
    }

    return null;
  } catch {
    return null;
  }
}
