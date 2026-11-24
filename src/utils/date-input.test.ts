import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  clampDate,
  dateFieldOrder,
  datePatternHint,
  daysInMonth,
  endOfWeek,
  formatInputDate,
  formatTime,
  monthGrid,
  parseIsoDate,
  parseTypedDate,
  parseTypedTime,
  startOfWeek,
  timeOptions,
  todayIn,
  weekStartFor,
} from './date-input';

describe('calendar arithmetic', () => {
  it('knows leap years', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months, clamping the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
  });

  it('is immune to DST transitions (pure calendar days)', () => {
    // Europe and the US change clocks around these dates.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('finds week boundaries for Sunday- and Monday-start weeks', () => {
    // 2026-11-25 is a Wednesday.
    expect(startOfWeek('2026-11-25', 0)).toBe('2026-11-22');
    expect(startOfWeek('2026-11-25', 1)).toBe('2026-11-23');
    expect(endOfWeek('2026-11-25', 1)).toBe('2026-11-29');
  });

  it('clamps into [min, max]', () => {
    expect(clampDate('2026-01-01', '2026-02-01')).toBe('2026-02-01');
    expect(clampDate('2026-03-01', undefined, '2026-02-01')).toBe('2026-02-01');
    expect(clampDate('2026-01-15', '2026-01-01', '2026-02-01')).toBe('2026-01-15');
  });

  it('lays a month out in whole weeks with padding', () => {
    const weeks = monthGrid(2026, 11, 1);
    // November 2026 starts on a Sunday → six leading pads in a Monday week.
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('rejects impossible ISO dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-2-3')).toBeNull();
    expect(parseIsoDate('2026-11-25')).toEqual({ year: 2026, month: 11, day: 25 });
  });
});

describe('locale awareness', () => {
  it('reads the numeric field order per locale', () => {
    expect(dateFieldOrder('en-US')).toEqual(['month', 'day', 'year']);
    expect(dateFieldOrder('es')).toEqual(['day', 'month', 'year']);
  });

  it('formats for display in the locale', () => {
    expect(formatInputDate('2026-11-05', 'en-US')).toBe('11/05/2026');
    expect(formatInputDate('2026-11-05', 'es')).toBe('05/11/2026');
    expect(formatInputDate('', 'en-US')).toBe('');
  });

  it('builds a pattern hint', () => {
    expect(datePatternHint('en-US')).toBe('MM/DD/YYYY');
    expect(datePatternHint('es')).toBe('DD/MM/YYYY');
  });

  it('picks a week start', () => {
    expect(weekStartFor('en-US')).toBe(0);
    expect(weekStartFor('es-ES')).toBe(1);
  });
});

describe('parseTypedDate (manual entry)', () => {
  it.each([
    ['2026-11-25', 'en-US', '2026-11-25'],
    ['2026/11/25', 'es', '2026-11-25'],
    ['11/25/2026', 'en-US', '2026-11-25'],
    ['25/11/2026', 'es', '2026-11-25'],
    ['25.11.26', 'es', '2026-11-25'],
    ['1-2-2027', 'en-US', '2027-01-02'],
  ])('%s in %s → %s', (text, locale, expected) => {
    expect(parseTypedDate(text, locale)).toBe(expected);
  });

  it.each(['', 'tomorrow', '13/13/2026', '02/30/2026', '11/25/226', '11/25'])('rejects %j', (text) => {
    expect(parseTypedDate(text, 'en-US')).toBeNull();
  });
});

describe('todayIn (explicit zone)', () => {
  it('uses the given zone, not the device zone', () => {
    const instant = new Date('2026-11-25T23:30:00Z');
    expect(todayIn('UTC', instant)).toBe('2026-11-25');
    expect(todayIn('Africa/Lagos', instant)).toBe('2026-11-26');
    expect(todayIn('America/Los_Angeles', instant)).toBe('2026-11-25');
  });
});

describe('times', () => {
  it.each([
    ['14:30', '14:30'],
    ['1430', '14:30'],
    ['9', '09:00'],
    ['9:05', '09:05'],
    ['2:30 pm', '14:30'],
    ['2pm', '14:00'],
    ['12 am', '00:00'],
    ['12pm', '12:00'],
    ['14.30', '14:30'],
    ['7:15 A.M.', '07:15'],
  ])('parses %j → %s', (text, expected) => {
    expect(parseTypedTime(text)).toBe(expected);
  });

  it.each(['', '24:00', '13pm', '9:60', 'noon', '0 am'])('rejects %j', (text) => {
    expect(parseTypedTime(text)).toBeNull();
  });

  it('formats per locale', () => {
    expect(formatTime('14:30', 'en-US')).toMatch(/^2:30\s?PM$/);
    expect(formatTime('14:30', 'es')).toBe('14:30');
  });

  it('lists options on a step within bounds', () => {
    expect(timeOptions(30, '09:00', '11:00')).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(timeOptions(15)).toHaveLength(96);
  });
});
