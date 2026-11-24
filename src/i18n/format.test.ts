import { describe, expect, it } from 'vitest';
import {
  createFormatters,
  directionFor,
  isRtlLocale,
  parseIso,
} from './format';

const enUS = createFormatters('en-US', 'UTC');
const enGB = createFormatters('en-GB', 'UTC');
const deDE = createFormatters('de-DE', 'UTC');

describe('locale-aware dates (#88)', () => {
  it('uses an unambiguous month name rather than numeric day/month', () => {
    expect(enUS.formatDate('2026-03-04')).toBe('Mar 4, 2026');
    expect(enGB.formatDate('2026-03-04')).toBe('4 Mar 2026');
    expect(deDE.formatDate('2026-03-04')).toContain('März');
  });

  it('formats the same instant differently per locale', () => {
    const value = '2026-03-04T10:30:00Z';
    expect(enUS.formatDate(value)).not.toBe(enGB.formatDate(value));
  });

  it('never shifts a date-only value across a time zone boundary', () => {
    // Noon UTC anchoring means this stays 4 March even in UTC-12.
    expect(enUS.formatDate('2026-03-04', { timeZone: 'Etc/GMT+12' })).toBe('Mar 4, 2026');
    expect(parseIso('2026-03-04').toISOString()).toBe('2026-03-04T12:00:00.000Z');
  });

  it('always shows an explicit time zone for appointment times', () => {
    const value = '2026-03-04T10:30:00Z';
    expect(enUS.formatAppointmentTime(value, 'UTC')).toMatch(/UTC|GMT/);
    expect(enUS.formatAppointmentTime(value, 'Europe/Berlin')).toMatch(/GMT\+1|UTC\+1|MEZ|CET/);
  });

  it('returns a dash for invalid input instead of "Invalid Date"', () => {
    expect(enUS.formatDate('not-a-date')).toBe('—');
    expect(enUS.formatDateTime('')).toBe('—');
  });

  it('formats relative time', () => {
    const now = new Date('2026-03-04T12:00:00Z');
    expect(enUS.formatRelativeTime('2026-03-03T12:00:00Z', now)).toBe('yesterday');
    expect(enUS.formatRelativeTime('2026-03-04T14:00:00Z', now)).toBe('in 2 hours');
  });
});

describe('locale-aware numbers (#88)', () => {
  it('groups numbers per locale', () => {
    expect(enUS.formatNumber(1234567.8)).toBe('1,234,567.8');
    expect(deDE.formatNumber(1234567.8)).toBe('1.234.567,8');
  });

  it('formats 0–100 rates as localized percentages', () => {
    expect(enUS.formatPercent(86.4)).toBe('86.4%');
    expect(deDE.formatPercent(86.4)).toMatch(/86,4\s*%/);
  });

  it('formats decimal strings without converting through Number', () => {
    expect(enUS.formatDecimalString('1234567.89')).toBe('1,234,567.89');
    expect(deDE.formatDecimalString('1234567.89')).toBe('1.234.567,89');
  });
});

describe('asset amounts (#88)', () => {
  it('formats stroops as XLM without losing precision', () => {
    expect(enUS.formatAssetAmount('1234567890', 'XLM', { decimals: 7 })).toBe('123.456789 XLM');
    expect(enUS.formatAssetAmount('9223372036854775807', 'XLM', { decimals: 7 })).toBe(
      '922,337,203,685.4775807 XLM',
    );
  });

  it('formats cent-denominated assets', () => {
    expect(enUS.formatAssetAmount('123456789', 'USDC', { decimals: 2 })).toBe('1,234,567.89 USDC');
  });

  it('keeps the sign and pads small amounts', () => {
    expect(enUS.formatAssetAmount('-5000000', 'XLM', { decimals: 7 })).toBe('-0.50 XLM');
    expect(enUS.formatAssetAmount('0', 'XLM', { decimals: 7 })).toBe('0.00 XLM');
  });

  it('never silently accepts a non-integer minor-unit string', () => {
    expect(() => enUS.formatAssetAmount('1.5', 'XLM', { decimals: 7 })).toThrow(/minor-unit/);
    expect(() => enUS.formatDecimalString('1,5')).toThrow(/decimal string/);
  });
});

describe('direction (#88)', () => {
  it('detects right-to-left locales', () => {
    expect(isRtlLocale('ar-EG')).toBe(true);
    expect(isRtlLocale('he')).toBe(true);
    expect(isRtlLocale('en-US')).toBe(false);
    expect(directionFor('ar-EG')).toBe('rtl');
    expect(directionFor('de-DE')).toBe('ltr');
  });
});
