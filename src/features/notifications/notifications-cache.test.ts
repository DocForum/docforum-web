import { describe, expect, it } from 'vitest';
import {
  applyStreamEvent,
  markAllRead,
  markOneRead,
  notificationsFrom,
  parseStreamEvent,
  prependNotification,
  unreadCountFrom,
} from './notifications-cache';
import type { NotificationPages } from './notifications-cache';
import type { Notification, NotificationPage } from '../../types/models';

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'ntf-1',
    kind: 'appointment_booked',
    title: 'Appointment booked',
    body: 'Confirmed.',
    link: '/patient/appointments',
    readAt: null,
    createdAt: '2026-10-21T10:00:00.000Z',
    ...overrides,
  };
}

function page(items: Notification[], nextCursor: string | null = null, unreadCount?: number): NotificationPage {
  return {
    items,
    nextCursor,
    unreadCount: unreadCount ?? items.filter((item) => item.readAt === null).length,
  };
}

function pages(...list: NotificationPage[]): NotificationPages {
  return { pages: list, pageParams: list.map(() => null) };
}

describe('reading the cache', () => {
  it('flattens loaded pages and reads the badge from the newest page only', () => {
    const data = pages(
      page([notification({ id: 'a' })], 'next', 7),
      page([notification({ id: 'b' })]),
    );
    expect(notificationsFrom(data).map((item) => item.id)).toEqual(['a', 'b']);
    // 7 is the server total — not the 2 rows that happen to be loaded.
    expect(unreadCountFrom(data)).toBe(7);
    expect(unreadCountFrom(undefined)).toBe(0);
  });
});

describe('prependNotification', () => {
  it('adds a live notification to the top and bumps the badge', () => {
    const before = pages(page([notification({ id: 'a' })], null, 3));
    const after = prependNotification(before, notification({ id: 'new' }));

    expect(notificationsFrom(after).map((item) => item.id)).toEqual(['new', 'a']);
    expect(unreadCountFrom(after)).toBe(4);
  });

  it('de-duplicates an event that raced a refetch, without double-counting', () => {
    const existing = notification({ id: 'dup', title: 'Old copy' });
    const before = pages(page([existing], null, 3));

    const after = prependNotification(before, { ...existing, title: 'New copy' });

    expect(notificationsFrom(after)).toHaveLength(1);
    expect(notificationsFrom(after)[0].title).toBe('New copy');
    expect(unreadCountFrom(after)).toBe(3);
  });

  it('trusts an explicit server unread count', () => {
    const after = prependNotification(
      pages(page([], null, 1)),
      notification({ id: 'live' }),
      9,
    );
    expect(unreadCountFrom(after)).toBe(9);
  });
});

describe('marking read', () => {
  it('marks one row across pages and decrements the badge', () => {
    const before = pages(
      page([notification({ id: 'a' })], 'next', 2),
      page([notification({ id: 'b' })]),
    );

    const after = markOneRead(before, 'b', '2026-10-21T12:00:00.000Z');
    expect(notificationsFrom(after).find((item) => item.id === 'b')?.readAt).toBe(
      '2026-10-21T12:00:00.000Z',
    );
    expect(unreadCountFrom(after)).toBe(1);
  });

  it('is a no-op for an already-read row (no phantom decrement)', () => {
    const read = notification({ id: 'a', readAt: '2026-10-21T09:00:00.000Z' });
    const before = pages(page([read], null, 0));
    expect(markOneRead(before, 'a', '2026-10-21T12:00:00.000Z')).toBe(before);
  });

  it('marks everything read and zeroes the badge', () => {
    const before = pages(
      page([notification({ id: 'a' }), notification({ id: 'b' })], null, 2),
      page([notification({ id: 'c' })]),
    );
    const after = markAllRead(before, '2026-10-21T12:00:00.000Z');

    expect(unreadCountFrom(after)).toBe(0);
    expect(notificationsFrom(after).every((item) => item.readAt !== null)).toBe(true);
  });
});

describe('applyStreamEvent', () => {
  it('applies a live notification event', () => {
    const after = applyStreamEvent(
      pages(page([], null, 0)),
      { type: 'notification', notification: notification({ id: 'live' }), unreadCount: 1 },
    );
    expect(notificationsFrom(after).map((item) => item.id)).toEqual(['live']);
    expect(unreadCountFrom(after)).toBe(1);
  });

  it('applies a read event (e.g. from another tab) with the server total', () => {
    const after = applyStreamEvent(
      pages(page([notification({ id: 'a' }), notification({ id: 'b' })], null, 2)),
      { type: 'read', notificationIds: ['a'], unreadCount: 1 },
      '2026-10-21T12:00:00.000Z',
    );
    const items = notificationsFrom(after);
    expect(items.find((item) => item.id === 'a')?.readAt).toBe('2026-10-21T12:00:00.000Z');
    expect(items.find((item) => item.id === 'b')?.readAt).toBeNull();
    expect(unreadCountFrom(after)).toBe(1);
  });
});

describe('parseStreamEvent', () => {
  it('parses a notification event and fills missing optional fields', () => {
    const event = parseStreamEvent(
      JSON.stringify({
        type: 'notification',
        unreadCount: 4,
        notification: { id: 'n1', kind: 'order_issued', title: 'Order issued' },
      }),
    );

    expect(event).toMatchObject({
      type: 'notification',
      unreadCount: 4,
      notification: { id: 'n1', kind: 'order_issued', title: 'Order issued', link: null, readAt: null },
    });
  });

  it('parses read events and drops non-string ids', () => {
    const event = parseStreamEvent(
      JSON.stringify({ type: 'read', notificationIds: ['a', 2, null], unreadCount: 1 }),
    );
    expect(event).toEqual({ type: 'read', notificationIds: ['a'], unreadCount: 1 });
  });

  it('ignores malformed, unknown or unrelated messages instead of throwing', () => {
    expect(parseStreamEvent('not json')).toBeNull();
    expect(parseStreamEvent('null')).toBeNull();
    expect(parseStreamEvent(JSON.stringify({ type: 'other' }))).toBeNull();
    expect(parseStreamEvent(JSON.stringify({ type: 'notification' }))).toBeNull();
    expect(parseStreamEvent(JSON.stringify({ type: 'read', notificationIds: 'nope' }))).toBeNull();
  });
});
