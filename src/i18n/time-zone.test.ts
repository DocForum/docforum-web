import { describe, expect, it } from 'vitest';
import {
  dualZoneLabel,
  formatDate,
  formatDateTime,
  formatTime,
  formatZoneName,
  getBrowserTimeZone,
  isValidTimeZone,
  listTimeZones,
  zonesDiffer,
} from './time-zone';

describe('time zone formatting', () => {
  it('formats the same instant differently in explicit IANA zones', () => {
    const instant = '2026-07-01T12:00:00.000Z';
    expect(formatTime(instant, 'UTC')).toBe('12:00');
    expect(formatTime(instant, 'America/New_York')).toBe('08:00');
    expect(formatTime(instant, 'Asia/Tokyo')).toBe('21:00');
    expect(formatDate(instant, 'America/New_York')).toMatch(/Jul 1, 2026/);
    expect(formatDate(instant, 'Asia/Tokyo')).toMatch(/Jul 1, 2026/);
  });

  it('handles the spring-forward DST gap in America/New_York', () => {
    // 02:00–03:00 local does not exist on 2026-03-08.
    expect(formatTime('2026-03-08T06:30:00.000Z', 'America/New_York')).toBe('01:30');
    expect(formatTime('2026-03-08T07:30:00.000Z', 'America/New_York')).toBe('03:30');
  });

  it('handles the autumn fall-back DST overlap in America/New_York', () => {
    // Both instants render as 01:30 local, but with different offsets.
    expect(formatTime('2026-11-01T05:30:00.000Z', 'America/New_York')).toBe('01:30');
    expect(formatTime('2026-11-01T06:30:00.000Z', 'America/New_York')).toBe('01:30');
    expect(formatZoneName('America/New_York', '2026-11-01T05:30:00.000Z')).not.toBe(
      formatZoneName('America/New_York', '2026-11-01T06:30:00.000Z'),
    );
  });

  it('handles a slot that crosses midnight between zones', () => {
    const instant = '2026-10-18T23:30:00.000Z';
    expect(formatDateTime(instant, 'UTC')).toMatch(/Oct 18, 2026/);
    expect(formatDateTime(instant, 'Asia/Tokyo')).toMatch(/Oct 19, 2026/);
    expect(formatTime(instant, 'Asia/Tokyo')).toBe('08:30');
  });

  it('requires a valid explicit zone and returns a dash for missing values', () => {
    expect(() => formatTime('2026-01-01T00:00:00Z', 'Not/AZone')).toThrow();
    expect(formatTime(null, 'UTC')).toBe('—');
    expect(formatDateTime('not-a-date', 'UTC')).toBe('—');
  });

  it('reports whether two zones differ and labels the counterpart', () => {
    expect(zonesDiffer('UTC', 'Europe/London')).toBe(true);
    expect(zonesDiffer('UTC', 'UTC')).toBe(false);
    expect(dualZoneLabel('UTC', 'America/New_York')).toBe("Doctor's time");
    expect(dualZoneLabel('UTC', 'UTC')).toBeNull();
    expect(dualZoneLabel('UTC', null)).toBeNull();
  });

  it('validates and lists IANA zones including UTC and the browser zone', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    const zones = listTimeZones();
    expect(zones).toContain('UTC');
    expect(zones).toContain(getBrowserTimeZone());
  });
});
