// Facility finder service (#29) with location-based distance sorting.
import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

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
