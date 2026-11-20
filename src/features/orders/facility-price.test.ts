import { describe, expect, it } from 'vitest';
import type { EligibleFacility, FacilityPrice } from '../../types/models';
import {
  compareFacilitiesByPrice,
  priceInForce,
  recentPriceChange,
} from './facility-price';

const NOW = Date.parse('2026-11-20T12:00:00.000Z');

function price(overrides: Partial<FacilityPrice>): FacilityPrice {
  return {
    id: 'prc-1',
    facilityId: 'fac-1',
    catalogItemCode: 'MED-AMOX-500',
    catalogItemName: 'Amoxicillin 500mg',
    asset: 'XLM',
    amountStroops: '250000000',
    effectiveFrom: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function facility(overrides: Partial<EligibleFacility>): EligibleFacility {
  return {
    id: 'fac-1',
    userId: 'u-1',
    name: 'Facility A',
    type: 'pharmacy',
    price: null,
    priceOnRequest: true,
    ...overrides,
  };
}

describe('priceInForce', () => {
  it('picks the latest version already effective and ignores a future-dated one', () => {
    const current = price({ id: 'current', effectiveFrom: '2026-10-15T00:00:00.000Z' });
    const scheduled = price({
      id: 'scheduled',
      amountStroops: '300000000',
      effectiveFrom: '2026-12-01T00:00:00.000Z',
    });
    const superseded = price({ id: 'old', effectiveFrom: '2026-09-01T00:00:00.000Z' });

    expect(priceInForce([superseded, scheduled, current], 'MED-AMOX-500', NOW)?.id).toBe('current');
  });

  it('returns null when every version is scheduled', () => {
    const scheduled = price({ effectiveFrom: '2026-12-01T00:00:00.000Z' });
    expect(priceInForce([scheduled], 'MED-AMOX-500', NOW)).toBeNull();
  });
});

describe('recentPriceChange', () => {
  it('reports an in-force change inside the recent window', () => {
    const history = [
      price({ id: 'old', effectiveFrom: '2026-09-01T00:00:00.000Z' }),
      price({ id: 'new', effectiveFrom: '2026-11-10T00:00:00.000Z' }),
    ];
    expect(recentPriceChange(history, 'MED-AMOX-500', NOW)?.id).toBe('new');
  });

  it('does not treat a first-ever or a scheduled price as a change', () => {
    const first = [price({ effectiveFrom: '2026-11-10T00:00:00.000Z' })];
    expect(recentPriceChange(first, 'MED-AMOX-500', NOW)).toBeNull();

    const scheduled = [
      price({ id: 'old', effectiveFrom: '2026-09-01T00:00:00.000Z' }),
      price({ id: 'new', effectiveFrom: '2026-12-01T00:00:00.000Z' }),
    ];
    // The only in-force version is the old one, and it is not recent.
    expect(recentPriceChange(scheduled, 'MED-AMOX-500', NOW)).toBeNull();
  });
});

describe('compareFacilitiesByPrice', () => {
  it('orders by raw stroops, beyond what a JS number can hold exactly', () => {
    // 9_007_199_254_740_993 is Number.MAX_SAFE_INTEGER + 2; as a float both
    // values would compare equal.
    const expensive = facility({
      id: 'expensive',
      price: { amountStroops: '9007199254740993', effectiveFrom: '2026-10-01T00:00:00.000Z' },
      priceOnRequest: false,
    });
    const cheap = facility({
      id: 'cheap',
      price: { amountStroops: '9007199254740992', effectiveFrom: '2026-10-01T00:00:00.000Z' },
      priceOnRequest: false,
    });

    expect([expensive, cheap].sort(compareFacilitiesByPrice).map((f) => f.id)).toEqual([
      'cheap',
      'expensive',
    ]);
  });

  it('puts priced facilities before price-on-request ones, ties by distance then name', () => {
    const onRequestNearby = facility({ id: 'on-request', distanceKm: 0.1 });
    const pricedFar = facility({
      id: 'priced-far',
      distanceKm: 9,
      price: { amountStroops: '250000000', effectiveFrom: '2026-10-01T00:00:00.000Z' },
      priceOnRequest: false,
    });
    const pricedNear = facility({
      id: 'priced-near',
      distanceKm: 1,
      price: { amountStroops: '250000000', effectiveFrom: '2026-10-01T00:00:00.000Z' },
      priceOnRequest: false,
    });

    expect(
      [onRequestNearby, pricedFar, pricedNear].sort(compareFacilitiesByPrice).map((f) => f.id),
    ).toEqual(['priced-near', 'priced-far', 'on-request']);
  });
});
