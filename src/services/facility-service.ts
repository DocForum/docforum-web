// Facility finder service (#29) on docforum-core's `GET /facilities/eligible`
// (#257), with the per-item prices patients compare before choosing a
// facility (#258).
import type { Schemas } from '@docforum/api-client';
import type { EligibleFacility, FacilityPrice, FacilityWithDistance } from '../types/models';
import { apiFetch } from './api-client';

export interface FacilitySearchParams {
  type?: Schemas['FacilityType'];
  lat?: number;
  lng?: number;
  query?: string;
}

const FACILITY_TYPES: Schemas['FacilityType'][] = ['pharmacy', 'lab'];

/** Nearest first; facilities whose distance is unknown (`null`) go last. */
function byDistanceUnknownLast<T extends { distanceKm?: number | null; name: string }>(
  a: T,
  b: T,
): number {
  const aKm = a.distanceKm ?? Number.POSITIVE_INFINITY;
  const bKm = b.distanceKm ?? Number.POSITIVE_INFINITY;
  if (aKm !== bKm) return aKm - bKm;
  return a.name.localeCompare(b.name);
}

/** docforum-core has no free-text search on this endpoint, so the finder's
 * area box filters the returned list by name and city instead. */
function matchesArea(facility: FacilityWithDistance, query: string | undefined): boolean {
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  return (
    facility.name.toLowerCase().includes(q) ||
    Boolean(facility.location?.city.toLowerCase().includes(q)) ||
    Boolean(facility.location?.address.toLowerCase().includes(q))
  );
}

/**
 * `GET /facilities/eligible` (docforum-core, public, issue #257). `type` is
 * required, so "all facilities" asks once per type and merges. Location goes
 * as `near=lat,lng` and is never logged or stored.
 */
async function fetchEligible<T extends FacilityWithDistance>(
  params: FacilitySearchParams,
  catalogItemCode: string | undefined,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<T[]> {
  const types = params.type ? [params.type] : FACILITY_TYPES;
  const pages = await Promise.all(
    types.map((type) => {
      const search = new URLSearchParams({ type });
      if (catalogItemCode) search.set('catalogItemCode', catalogItemCode);
      if (params.lat !== undefined && params.lng !== undefined) {
        search.set('near', `${params.lat},${params.lng}`);
      }
      return apiFetch<T[]>(`/facilities/eligible?${search.toString()}`, {
        accessToken,
        signal,
      });
    }),
  );
  return pages
    .flat()
    .filter((facility) => matchesArea(facility, params.query))
    .sort(byDistanceUnknownLast);
}

export function getFacilities(
  params: FacilitySearchParams = {},
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<FacilityWithDistance[]> {
  return fetchEligible<FacilityWithDistance>(params, undefined, accessToken, signal);
}

/**
 * Facilities qualified to fulfil an order kind — the REAL
 * `GET /facilities/eligible` (docforum-core issue #127). Order issuance needs
 * one of these ids as `facilityProfileId`. `catalogItemCode` asks for the
 * price in force for that code; the endpoint returns the list directly.
 */
export async function listEligibleFacilities(
  type: 'lab' | 'pharmacy',
  accessToken: string,
  catalogItemCode?: string,
): Promise<EligibleFacility[]> {
  const params = new URLSearchParams({ type });
  if (catalogItemCode) params.set('catalogItemCode', catalogItemCode);
  return apiFetch<EligibleFacility[]>(`/facilities/eligible?${params.toString()}`, {
    accessToken,
  });
}

/**
 * Facilities eligible to fulfil one catalog item, each with its price in force
 * for that item (or `priceOnRequest`, issue #258). Same endpoint and filters
 * as `getFacilities`, plus `catalogItemCode`.
 */
export function getEligibleFacilities(
  catalogItemCode: string,
  params: FacilitySearchParams = {},
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<EligibleFacility[]> {
  return fetchEligible<EligibleFacility>(params, catalogItemCode, accessToken, signal);
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
