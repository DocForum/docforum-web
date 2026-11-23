import { describe, expect, it } from 'vitest';
import { resolvePricing, xlmToStroops } from './pricing';

describe('xlmToStroops', () => {
  it('converts whole and fractional XLM to integer stroops', () => {
    expect(xlmToStroops('2')).toBe('20000000');
    expect(xlmToStroops('1.5')).toBe('15000000');
    expect(xlmToStroops('0.0000001')).toBe('1');
    expect(xlmToStroops(' 12.3456789 ')).toBe('123456789');
  });

  it('rejects zero, negatives, non-numeric input and excess precision', () => {
    expect(xlmToStroops('0')).toBeNull();
    expect(xlmToStroops('0.0')).toBeNull();
    expect(xlmToStroops('-1')).toBeNull();
    expect(xlmToStroops('abc')).toBeNull();
    expect(xlmToStroops('1.12345678')).toBeNull();
    expect(xlmToStroops('1,5')).toBeNull();
    expect(xlmToStroops('')).toBeNull();
  });
});

describe('resolvePricing', () => {
  it('sends only a catalog code in catalog mode', () => {
    expect(resolvePricing('catalog', ' amox-500-cap ', '9')).toEqual({
      ok: true,
      pricing: { catalogItemCode: 'amox-500-cap' },
    });
  });

  it('sends only stroops in manual mode', () => {
    expect(resolvePricing('manual', 'ignored', '2.5')).toEqual({
      ok: true,
      pricing: { amountStroops: '25000000' },
    });
  });

  it('explains missing or invalid values instead of guessing', () => {
    expect(resolvePricing('catalog', '   ', '')).toMatchObject({ ok: false });
    expect(resolvePricing('manual', '', 'nope')).toMatchObject({ ok: false });
  });
});
