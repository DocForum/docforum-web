// In-app notification inbox (issue #107). Dev-mock only: the contract is
// assumed until docforum-core#93 lands (see ARCHITECTURE_ESSENTIALS.md).
// Cursor pagination is faked with a numeric offset — page size is deliberately
// small so the page's "load older" path is exercisable in `npm run dev:mock`.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';

const PAGE_SIZE = 4;

function sortNewestFirst() {
  return [...db.notifications].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

function unreadTotal(): number {
  return db.notifications.filter((notification) => notification.readAt === null).length;
}

export const notificationHandlers = [
  http.get(
    '*/notifications',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const offset = Math.max(0, Number(url.searchParams.get('cursor') ?? '0') || 0);
      const requested = Number(url.searchParams.get('limit') ?? PAGE_SIZE);
      const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 50) : PAGE_SIZE;

      const all = sortNewestFirst();
      const items = all.slice(offset, offset + limit);
      const nextOffset = offset + items.length;

      return {
        items,
        nextCursor: nextOffset < all.length ? String(nextOffset) : null,
        unreadCount: unreadTotal(),
      };
    }),
  ),

  // Registered before `/:id/read` for clarity; the paths do not actually
  // overlap because of the trailing segment.
  http.post(
    '*/notifications/read-all',
    respond('json', () => {
      const now = new Date().toISOString();
      let updated = 0;
      for (const notification of db.notifications) {
        if (notification.readAt === null) {
          notification.readAt = now;
          updated += 1;
        }
      }
      return { updated, unreadCount: 0 };
    }),
  ),

  http.post(
    '*/notifications/:notificationId/read',
    respond('json', ({ params }) => {
      const notification = db.notifications.find(
        (candidate) => candidate.id === paramId(params, 'notificationId'),
      );
      if (!notification) return notFound('notification');
      if (notification.readAt === null) notification.readAt = new Date().toISOString();
      return notification;
    }),
  ),

  // The browser build cannot stream from MSW, so this only proves the ticket
  // shape; `useNotificationLiveUpdates` treats a failed stream as "polling
  // only" and gives up after two reconnect attempts.
  http.get(
    '*/notifications/stream-ticket',
    respond('json', () => {
      const ticket = `mock-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        ticket,
        streamPath: `/notifications/stream?ticket=${encodeURIComponent(ticket)}`,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
    }),
  ),

  // Stream placeholder: EventSource fails fast against a 204 instead of
  // hammering a non-existent localhost backend in mock mode.
  http.get('*/notifications/stream', () => new HttpResponse(null, { status: 204 })),
];
