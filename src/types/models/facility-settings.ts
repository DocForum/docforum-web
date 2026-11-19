import type { PayoutAsset } from './facility-payout-ledger';
import type { FacilityType } from './session-idle-timeout';

// --- Phase W4 — Facility settings & price lists (issue #56) -----------------
// Assumed contracts pending docforum-core#74 (facility location) and
// docforum-core#127 (versioned facility price lists). See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W4".

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface FacilityOpeningHours {
  day: Weekday;
  closed: boolean;
  /** 24-hour `HH:mm`, or null when the facility is closed that day. */
  opensAt: string | null;
  closesAt: string | null;
}

export interface FacilitySettings {
  facilityId: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string | null;
  openingHours: FacilityOpeningHours[];
  updatedAt: string;
}

export interface FacilitySettingsInput {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string | null;
  openingHours: FacilityOpeningHours[];
}

export interface CatalogItem {
  /** Stable catalog code stored on a FacilityPrice. */
  code: string;
  name: string;
  type: FacilityType;
  description?: string | null;
}

/** One immutable version of a facility price. The row effective latest on or
 * before now is the current price; future rows are scheduled changes. */
export interface FacilityPrice {
  id: string;
  facilityId: string;
  catalogItemCode: string;
  catalogItemName: string;
  asset: PayoutAsset;
  /** BigInt-safe raw stroops — 1 XLM/USDC = 10,000,000 stroops. */
  amountStroops: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface FacilityPriceInput {
  catalogItemCode: string;
  asset: PayoutAsset;
  amountStroops: string;
  effectiveFrom: string;
}
