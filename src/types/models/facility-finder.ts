import type { FacilityProfile } from './session-idle-timeout';

// --- Facility finder with location & distance (Phase W2, issue #29) ----------

export interface FacilityLocation {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface FacilityWithDistance extends FacilityProfile {
  location?: FacilityLocation;
  distanceKm?: number | null;
  isOpen?: boolean;
  phone?: string;
  rating?: number;
}

// --- Facility prices for an order item (Phase W2, issue #258) ---------------
// Assumed contract: `GET /facilities/eligible?catalogItemCode=` returns each
// eligible facility with the price in force for that catalog item, or
// `price: null` plus `priceOnRequest: true`. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions".

export interface FacilityItemPrice {
  /** BigInt-safe raw stroops — format with `features/payments/stroops.ts` and
   * never by converting to a JS `number`. */
  amountStroops: string;
  effectiveFrom: string;
}

export interface EligibleFacility extends FacilityWithDistance {
  /** The price in force now; `null` when the facility has none (on request). */
  price: FacilityItemPrice | null;
  priceOnRequest: boolean;
}
