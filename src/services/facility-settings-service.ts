// Facility settings and versioned price lists (issue #56). All calls go
// through docforum-core's API — see ARCHITECTURE_ESSENTIALS.md hard rules.
// The endpoint shapes are assumed pending docforum-core#74/#127.
import { apiFetch } from './api-client';
import type {
  CatalogItem,
  FacilityPrice,
  FacilityPriceInput,
  FacilitySettings,
  FacilitySettingsInput,
} from '../types/models';

export function getFacilitySettings(
  facilityId: string,
  accessToken: string,
): Promise<FacilitySettings> {
  return apiFetch<FacilitySettings>(`/facilities/${facilityId}/settings`, { accessToken });
}

export function updateFacilitySettings(
  facilityId: string,
  input: FacilitySettingsInput,
  accessToken: string,
): Promise<FacilitySettings> {
  return apiFetch<FacilitySettings>(`/facilities/${facilityId}/settings`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

export function searchCatalogItems(
  query: string,
  accessToken: string,
): Promise<CatalogItem[]> {
  const qs = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  return apiFetch<CatalogItem[]>(`/catalog/items${qs}`, { accessToken });
}

export function listFacilityPrices(
  facilityId: string,
  accessToken: string,
): Promise<FacilityPrice[]> {
  return apiFetch<FacilityPrice[]>(`/facilities/${facilityId}/prices`, { accessToken });
}

export function createFacilityPrice(
  facilityId: string,
  input: FacilityPriceInput,
  accessToken: string,
): Promise<FacilityPrice> {
  return apiFetch<FacilityPrice>(`/facilities/${facilityId}/prices`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
