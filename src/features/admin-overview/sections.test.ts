import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-client';
import {
  boardErrorMessage,
  formatAge,
  oldestAgeMs,
  sectionDrillDown,
  sectionTone,
} from './sections';
import type { AdminOverviewSection } from '../../types/models';

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-10-21T12:00:00.000Z');

function section(overrides: Partial<AdminOverviewSection> = {}): AdminOverviewSection {
  return {
    key: 'stuck_referrals',
    label: 'Stuck referrals',
    available: true,
    count: 1,
    oldestItemCreatedAt: '2026-10-21T11:00:00.000Z',
    ...overrides,
  };
}

describe('sectionDrillDown', () => {
  it('links the known queues to their admin screens', () => {
    expect(sectionDrillDown('stuck_referrals')).toEqual({
      route: '/admin/referrals',
      action: 'Open the referrals console',
    });
    expect(sectionDrillDown('stuck_payments')?.route).toBe('/admin/payments/console');
    expect(sectionDrillDown('failed_jobs')?.route).toBe('/admin/system');
    expect(sectionDrillDown('open_disputes')?.route).toBe('/admin/disputes');
  });

  it('has no link for queues without a screen, for unknown future keys, and for prototype keys', () => {
    expect(sectionDrillDown('verifications')).toBeNull();
    expect(sectionDrillDown('unrouted_orders')).toBeNull();
    expect(sectionDrillDown('some_queue_tomorrow')).toBeNull();
    expect(sectionDrillDown('constructor')).toBeNull();
    expect(sectionDrillDown('__proto__')).toBeNull();
  });
});

describe('oldestAgeMs', () => {
  it('measures the age of the oldest item against now', () => {
    expect(oldestAgeMs(section(), NOW)).toBe(HOUR);
  });

  it('is null when unavailable, empty, or unparseable', () => {
    expect(oldestAgeMs(section({ available: false }), NOW)).toBeNull();
    expect(oldestAgeMs(section({ oldestItemCreatedAt: null }), NOW)).toBeNull();
    expect(oldestAgeMs(section({ oldestItemCreatedAt: 'not a date' }), NOW)).toBeNull();
  });

  it('never reports a negative age from clock skew', () => {
    expect(oldestAgeMs(section({ oldestItemCreatedAt: '2026-10-21T13:00:00.000Z' }), NOW)).toBe(0);
  });
});

describe('sectionTone', () => {
  it('is ok for an empty queue', () => {
    expect(sectionTone(section({ count: 0, oldestItemCreatedAt: null }), NOW)).toBe('ok');
  });

  it('escalates with the age of the oldest item', () => {
    const fresh = section({ oldestItemCreatedAt: '2026-10-21T11:00:00.000Z' });
    expect(sectionTone(fresh, NOW)).toBe('info');
    expect(sectionTone(section({ oldestItemCreatedAt: '2026-10-20T11:30:00.000Z' }), NOW)).toBe('warning');
    expect(sectionTone(section({ oldestItemCreatedAt: '2026-10-18T12:00:00.000Z' }), NOW)).toBe('danger');
  });

  it('stays info when a non-empty queue reports no age', () => {
    expect(sectionTone(section({ count: 4, oldestItemCreatedAt: null }), NOW)).toBe('info');
  });

  it('is muted neutral for an unavailable queue, whatever its fields say', () => {
    expect(sectionTone(section({ available: false, count: null, oldestItemCreatedAt: null }), NOW)).toBe('neutral');
  });
});

describe('formatAge', () => {
  it('reads as plain compact durations', () => {
    expect(formatAge(0)).toBe('under a minute');
    expect(formatAge(59_000)).toBe('under a minute');
    expect(formatAge(60_000)).toBe('1 minute');
    expect(formatAge(45 * 60_000)).toBe('45 minutes');
    expect(formatAge(HOUR)).toBe('1 hour');
    expect(formatAge(3 * HOUR)).toBe('3 hours');
    expect(formatAge(47 * HOUR)).toBe('47 hours');
    expect(formatAge(48 * HOUR)).toBe('2 days');
    expect(formatAge(7 * DAY)).toBe('7 days');
  });
});

describe('boardErrorMessage', () => {
  it('treats a 404 as the backend not having landed yet', () => {
    expect(boardErrorMessage(new ApiError('Not Found', 404))).toBe(
      "docforum-core doesn't serve the operations overview yet (docforum-core#123).",
    );
  });

  it('names lost admin access on 401/403', () => {
    expect(boardErrorMessage(new ApiError('Forbidden', 403))).toMatch(/no longer has admin access/);
  });

  it('falls back to a retrying explanation for anything else', () => {
    expect(boardErrorMessage(new ApiError('boom', 500))).toMatch(/tries again every 60 seconds/);
    expect(boardErrorMessage(new TypeError('fetch failed'))).toMatch(/tries again every 60 seconds/);
  });
});
