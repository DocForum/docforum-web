import { describe, expect, it } from 'vitest';
import { formatAge } from './age';

const NOW = new Date('2026-11-19T12:00:00.000Z');

describe('formatAge (#68)', () => {
  it('says nothing is waiting when there is no oldest item', () => {
    expect(formatAge(null, NOW)).toBe('Nothing waiting');
  });

  it('renders minutes, hours and days', () => {
    expect(formatAge('2026-11-19T11:59:30.000Z', NOW)).toBe('Just arrived');
    expect(formatAge('2026-11-19T11:30:00.000Z', NOW)).toBe('30 minutes');
    expect(formatAge('2026-11-19T10:00:00.000Z', NOW)).toBe('2 hours');
    expect(formatAge('2026-11-16T12:00:00.000Z', NOW)).toBe('3 days');
    expect(formatAge('2026-11-18T12:00:00.000Z', NOW)).toBe('1 day');
  });

  it('does not crash on an unreadable timestamp', () => {
    expect(formatAge('not-a-date', NOW)).toBe('Age unavailable');
  });
});
