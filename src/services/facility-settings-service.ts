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
  _facilityId: string,
  accessToken: string,
): Promise<FacilityPrice[]> {
  // Phase W4: use /me endpoint so the backend determines the facility from the
  // signed-in user rather than a passed-in id.
  return apiFetch<FacilityPrice[]>(`/facilities/me/prices`, { accessToken });
}

export function createFacilityPrice(
  _facilityId: string,
  input: FacilityPriceInput,
  accessToken: string,
): Promise<FacilityPrice> {
  // Phase W4: use /me endpoint so the backend determines the facility from the
  // signed-in user rather than a passed-in id.
  return apiFetch<FacilityPrice>(`/facilities/me/prices`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
