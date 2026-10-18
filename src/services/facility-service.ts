// Facility finder service (#29) with location-based distance sorting.
// Calls docforum-core's API per ARCHITECTURE_ESSENTIALS.md.
import { apiFetch } from './api-client';
import type { FacilityType, FacilityWithDistance } from '../types/models';

export interface FacilitySearchParams {
  type?: FacilityType;
  lat?: number;
  lng?: number;
  query?: string;
}

export function getFacilities(
  params: FacilitySearchParams = {},
  accessToken?: string | null,
): Promise<FacilityWithDistance[]> {
  const queryParts: string[] = [];
  if (params.type) queryParts.push(`type=${encodeURIComponent(params.type)}`);
  if (params.lat !== undefined && params.lng !== undefined) {
    queryParts.push(`lat=${encodeURIComponent(params.lat)}`);
    queryParts.push(`lng=${encodeURIComponent(params.lng)}`);
  }
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiFetch<FacilityWithDistance[]>(`/facilities${qs}`, {
    accessToken,
  });
}
