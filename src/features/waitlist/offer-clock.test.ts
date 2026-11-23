import { describe, expect, it } from 'vitest';
import {
  formatRemaining,
  isUrgent,
  remainingMs,
  serverClockOffsetMs,
} from './offer-clock';

describe('waitlist offer clock', () => {
  it('measures the offset from the server clock rather than trusting the device', () => {
    // Device says 12:00:00; the server says 12:05:00 (5 minutes fast).
    const clientNow = Date.parse('2026-10-01T12:00:00.000Z');
    const offset = serverClockOffsetMs('2026-10-01T12:05:00.000Z', clientNow);
    expect(offset).toBe(5 * 60_000);

    // An offer expiring at server 12:05:30 really has 30s left, not 5m30s.
    expect(remainingMs('2026-10-01T12:05:30.000Z', offset, clientNow)).toBe(30_000);
  });

  it('uses the same clock for a device that is behind the server', () => {
    const clientNow = Date.parse('2026-10-01T12:10:00.000Z');
    const offset = serverClockOffsetMs('2026-10-01T12:00:00.000Z', clientNow);
    expect(offset).toBe(-10 * 60_000);
    expect(remainingMs('2026-10-01T12:02:00.000Z', offset, clientNow)).toBe(120_000);
  });

  it('never goes below zero and treats a malformed expiry as expired', () => {
    expect(remainingMs('2026-10-01T11:59:00.000Z', 0, Date.parse('2026-10-01T12:00:00.000Z'))).toBe(0);
    expect(remainingMs('not-a-date', 0)).toBe(0);
    expect(serverClockOffsetMs('not-a-date')).toBe(0);
  });

  it('formats to whole seconds and marks the last minute', () => {
    expect(formatRemaining(65_000)).toBe('1:05');
    expect(formatRemaining(5_000)).toBe('0:05');
    expect(formatRemaining(0)).toBe('0:00');
    expect(isUrgent(60_000)).toBe(true);
    expect(isUrgent(60_001)).toBe(false);
    expect(isUrgent(0)).toBe(false);
  });
});
