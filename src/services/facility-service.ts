// Facility finder service (#29) with location-based distance sorting, and the
// public per-item prices patients compare before choosing a facility (#258).
import type { Schemas } from '@docforum/api-client';
import type { EligibleFacility, FacilityPrice } from '../types/models';
import { api, apiFetch } from './api-client';

export interface FacilitySearchParams {
  type?: Schemas['FacilityType'];
  lat?: number;
  lng?: number;
  query?: string;
}

export function getFacilities(
  params: FacilitySearchParams = {},
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<Schemas['FacilityWithDistance'][]> {
  return api.facilities.list(params, { accessToken, signal });
}

/**
 * Facilities eligible to fulfil one catalog item, each with its price in force
 * for that item (or `priceOnRequest`). Assumed contract (issue #258) — the
 * finder's own filters are passed through too, so opening it from an order
 * keeps the type/area filters working. See ARCHITECTURE_ESSENTIALS.md
 * "Known assumptions".
 */
export function getEligibleFacilities(
  catalogItemCode: string,
  params: FacilitySearchParams = {},
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<EligibleFacility[]> {
  const search = new URLSearchParams({ catalogItemCode });
  if (params.type) search.set('type', params.type);
  if (params.lat !== undefined) search.set('lat', String(params.lat));
  if (params.lng !== undefined) search.set('lng', String(params.lng));
  if (params.query) search.set('query', params.query);
  return apiFetch<EligibleFacility[]>(`/facilities/eligible?${search.toString()}`, {
    accessToken,
    signal,
  });
}

/**
 * One facility's public price history. Every version is returned, including
 * scheduled (future-dated) ones — callers pick the row in force.
 */
export function getFacilityPriceHistory(
  facilityId: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<FacilityPrice[]> {
  return apiFetch<FacilityPrice[]>(
    `/facilities/${encodeURIComponent(facilityId)}/prices`,
    { accessToken, signal },
  );
}
