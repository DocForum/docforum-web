import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newNotificationsMessage, useNewNotificationAnnouncement } from './useNewNotificationAnnouncement';

const BATCH = 800;

interface Props {
  unreadCount: number;
  ready: boolean;
  resetKey: string | null;
}

function setup(initial: Props) {
  return renderHook((props: Props) => useNewNotificationAnnouncement({ ...props, batchMs: BATCH }), {
    initialProps: initial,
  });
}

function flush() {
  act(() => {
    vi.advanceTimersByTime(BATCH);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('newNotificationsMessage', () => {
  it('states the number added and the unread total', () => {
    expect(newNotificationsMessage(1, 4)).toBe('1 new notification. 4 unread.');
    expect(newNotificationsMessage(3, 3)).toBe('3 new notifications. 3 unread.');
  });
});

describe('useNewNotificationAnnouncement', () => {
  it('does not announce the count from the initial load', () => {
    const { result, rerender } = setup({ unreadCount: 0, ready: false, resetKey: 'u1' });
    rerender({ unreadCount: 5, ready: true, resetKey: 'u1' });
    flush();
    expect(result.current).toBe('');
  });

  it('does not announce anything before the first page has loaded', () => {
    const { result, rerender } = setup({ unreadCount: 0, ready: false, resetKey: 'u1' });
    rerender({ unreadCount: 2, ready: false, resetKey: 'u1' });
    flush();
    expect(result.current).toBe('');
  });

  it('announces an increase once, after the batching window', () => {
    const { result, rerender } = setup({ unreadCount: 2, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 3, ready: true, resetKey: 'u1' });
    expect(result.current).toBe('');
    flush();
    expect(result.current).toBe('1 new notification. 3 unread.');
    // Nothing else is pending: a later flush leaves the message unchanged.
    flush();
    expect(result.current).toBe('1 new notification. 3 unread.');
  });

  it('batches a burst of increases into one message with the total added', () => {
    const { result, rerender } = setup({ unreadCount: 1, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 2, ready: true, resetKey: 'u1' });
    act(() => {
      vi.advanceTimersByTime(BATCH / 4);
    });
    rerender({ unreadCount: 3, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 4, ready: true, resetKey: 'u1' });
    flush();
    expect(result.current).toBe('3 new notifications. 4 unread.');
  });

  it('never announces a decrease (mark read, mark all read)', () => {
    const { result, rerender } = setup({ unreadCount: 4, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 3, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 0, ready: true, resetKey: 'u1' });
    flush();
    expect(result.current).toBe('');
  });

  it('counts new arrivals from the lowered baseline after reading some', () => {
    const { result, rerender } = setup({ unreadCount: 4, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 0, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 1, ready: true, resetKey: 'u1' });
    flush();
    expect(result.current).toBe('1 new notification. 1 unread.');
  });

  it('announces a second arrival even when it reads the same as the first', () => {
    const { result, rerender } = setup({ unreadCount: 0, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 1, ready: true, resetKey: 'u1' });
    flush();
    const first = result.current;
    rerender({ unreadCount: 0, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 1, ready: true, resetKey: 'u1' });
    flush();
    expect(result.current.trim()).toBe('1 new notification. 1 unread.');
    expect(result.current).not.toBe(first);
  });

  it('starts from a fresh baseline when the account changes', () => {
    const { result, rerender } = setup({ unreadCount: 1, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 6, ready: false, resetKey: 'u2' });
    rerender({ unreadCount: 6, ready: true, resetKey: 'u2' });
    flush();
    expect(result.current).toBe('');
    rerender({ unreadCount: 7, ready: true, resetKey: 'u2' });
    flush();
    expect(result.current).toBe('1 new notification. 7 unread.');
  });

  it('drops a pending announcement when the account changes', () => {
    const { result, rerender } = setup({ unreadCount: 1, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 2, ready: true, resetKey: 'u1' });
    rerender({ unreadCount: 0, ready: false, resetKey: null });
    flush();
    expect(result.current).toBe('');
  });
});
