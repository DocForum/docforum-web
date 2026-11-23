import { describe, expect, it } from 'vitest';
import { parseDateOnly, validateDependentDob, isMinor } from './age';

describe('dependent age rules', () => {
  it('treats a dependent turning 18 today as no longer a minor', () => {
    const now = new Date(2026, 10, 19, 23, 45);
    expect(isMinor('2008-11-19', now)).toBe(false);
    expect(isMinor('2008-11-20', now)).toBe(true);
  });

  it('compares calendar dates, not UTC instants', () => {
    // Midday and just-after-midnight local are the same calendar day.
    const late = new Date(2026, 10, 19, 23, 45);
    const early = new Date(2026, 10, 19, 0, 15);
    expect(isMinor('2008-11-19', late)).toBe(false);
    expect(isMinor('2008-11-19', early)).toBe(false);
    expect(validateDependentDob('2008-11-19', early)).toMatch(/must be under 18/i);
  });

  it('accepts a 17-year-old and rejects the majority birthday', () => {
    const now = new Date(2026, 10, 19);
    expect(validateDependentDob('2009-11-20', now)).toBeNull();
    // 18 tomorrow: still a minor today.
    expect(validateDependentDob('2008-11-20', now)).toBeNull();
    expect(validateDependentDob('2008-11-19', now)).toMatch(/must be under 18/i);
    // Edits to an existing dependent only re-check that the date is valid.
    expect(validateDependentDob('2008-11-19', now, false)).toBeNull();
  });

  it('rejects impossible calendar dates', () => {
    expect(parseDateOnly('2012-02-30')).toBeNull();
    expect(parseDateOnly('2012-13-01')).toBeNull();
    expect(validateDependentDob('2012-02-30')).toBe('Enter a valid date.');
  });
});
