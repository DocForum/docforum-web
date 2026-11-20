// Price comparison for the order facility picker (issue #258).
//
// The API sends `amountStroops` as a string because the column is a BigInt, so
// every comparison here stays in BigInt. A price only counts as "in force"
// once its `effectiveFrom` has passed: a future-dated (scheduled) version is
// never shown as the current price.
import type { EligibleFacility, FacilityItemPrice, FacilityPrice } from '../../types/models';
import { amountLabel } from '../payments/stroops';

/** How long after a change the facility card still explains it. */
export const RECENT_PRICE_CHANGE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function effectiveMs(price: { effectiveFrom: string }): number {
  const parsed = Date.parse(price.effectiveFrom);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** The version in force for `catalogItemCode` at `now`, ignoring scheduled
 * (future-dated) rows. `FacilityPrice` and `FacilityItemPrice` both fit. */
export function priceInForce<T extends { catalogItemCode: string; effectiveFrom: string }>(
  prices: T[],
  catalogItemCode: string,
  now: number = Date.now(),
): T | null {
  return (
    prices
      .filter(
        (price) =>
          price.catalogItemCode === catalogItemCode && effectiveMs(price) <= now,
      )
      .sort((a, b) => effectiveMs(b) - effectiveMs(a))[0] ?? null
  );
}

/**
 * The price version in force when it replaced an earlier version within the
 * recent window, so the card can say "price changed on …". A first-ever price
 * is not a change, and a scheduled future version is never reported.
 */
export function recentPriceChange(
  prices: FacilityPrice[],
  catalogItemCode: string,
  now: number = Date.now(),
): FacilityPrice | null {
  const inForce = prices
    .filter(
      (price) =>
        price.catalogItemCode === catalogItemCode && effectiveMs(price) <= now,
    )
    .sort((a, b) => effectiveMs(b) - effectiveMs(a));
  const [latest, previous] = inForce;
  if (!latest || !previous) return null;
  return now - effectiveMs(latest) <= RECENT_PRICE_CHANGE_DAYS * MS_PER_DAY ? latest : null;
}

function stroopValue(price: FacilityItemPrice | null): bigint | null {
  if (!price || !/^\d+$/.test(price.amountStroops)) return null;
  return BigInt(price.amountStroops);
}

/** The displayed price for one facility, e.g. `27.5 XLM`. */
export function facilityPriceLabel(price: FacilityItemPrice): string {
  return amountLabel(price.amountStroops);
}

function byDistanceThenName(a: EligibleFacility, b: EligibleFacility): number {
  const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
  const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
  if (aDistance !== bDistance) return aDistance - bDistance;
  return a.name.localeCompare(b.name);
}

/**
 * Cheapest priced facility first; price-on-request facilities always come
 * after priced ones, however cheap the priced ones are. Unpriced-but-not-
 * marked facilities sort with the on-request ones. Ties fall back to distance,
 * then name, so the list stays stable and predictable.
 */
export function compareFacilitiesByPrice(a: EligibleFacility, b: EligibleFacility): number {
  const aStroops = stroopValue(a.price);
  const bStroops = stroopValue(b.price);
  if (aStroops !== null && bStroops !== null) {
    if (aStroops !== bStroops) return aStroops < bStroops ? -1 : 1;
    return byDistanceThenName(a, b);
  }
  if (aStroops !== null) return -1;
  if (bStroops !== null) return 1;
  return byDistanceThenName(a, b);
}
