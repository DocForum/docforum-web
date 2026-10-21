import { describe, expect, it } from 'vitest';
import { amountLabel, formatStroopsAsLumens } from './stroops';

describe('formatStroopsAsLumens', () => {
  it('splits stroops into XLM without a decimal point when they divide evenly', () => {
    expect(formatStroopsAsLumens('10000000')).toBe('1');
    expect(formatStroopsAsLumens('0')).toBe('0');
  });

  it('keeps every decimal place and drops only trailing zeros', () => {
    expect(formatStroopsAsLumens('1234567890123')).toBe('123,456.7890123');
    expect(formatStroopsAsLumens('15000000')).toBe('1.5');
    expect(formatStroopsAsLumens('10000001')).toBe('1.0000001');
  });

  // The review criterion for #37: a JS number would round this, and the
  // patient's receipt would be quietly wrong.
  it('stays exact above 2^53 stroops', () => {
    expect(formatStroopsAsLumens('9007199254740993')).toBe('900,719,925.4740993');
    expect(formatStroopsAsLumens('1000000000000000000000')).toBe('100,000,000,000,000');
  });

  it('refuses to invent a number for anything that is not a plain integer', () => {
    expect(formatStroopsAsLumens('12.5')).toBeNull();
    expect(formatStroopsAsLumens('-1')).toBeNull();
    expect(formatStroopsAsLumens('1e9')).toBeNull();
    expect(formatStroopsAsLumens('')).toBeNull();
  });
});

describe('amountLabel', () => {
  it('names the unit it printed', () => {
    expect(amountLabel('200000000')).toBe('20 XLM');
  });

  it('falls back to the raw stroops rather than a wrong XLM figure', () => {
    expect(amountLabel('not-a-number')).toBe('not-a-number stroops');
  });
});
