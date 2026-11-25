import { describe, expect, it } from 'vitest';
import { defaultMetricsDates, metricsWindowFromDates } from './date-range';

describe('metricsWindowFromDates', () => {
  it('converts inclusive local dates to offset-aware, half-open UTC timestamps', () => {
    const window = metricsWindowFromDates('2026-10-01', '2026-10-31');
    expect(Date.parse(window.from)).toBeLessThan(Date.parse(window.to));
    expect(Date.parse(window.to) - Date.parse(window.from)).toBeGreaterThanOrEqual(30 * 86_400_000);
    expect(window.timeZone).toBeTruthy();
  });

  it('rejects invalid, reversed and overlong ranges', () => {
    expect(() => metricsWindowFromDates('2026-02-30', '2026-03-01')).toThrow(/valid/);
    expect(() => metricsWindowFromDates('2026-04-02', '2026-04-01')).toThrow(/on or before/);
    expect(() => metricsWindowFromDates('2025-01-01', '2026-01-02')).toThrow(/366 days/);
  });

  it('defaults to the most recent 30 local calendar days', () => {
    expect(defaultMetricsDates(new Date(2026, 9, 31))).toEqual({
      from: '2026-10-02',
      through: '2026-10-31',
    });
  });
});
