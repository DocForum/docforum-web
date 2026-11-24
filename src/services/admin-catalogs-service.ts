import { apiFetch } from './api-client';
import type { AdminCatalogInput, CatalogKind, AdminCatalogPage, AdminCatalogItem, AdminSymptomMappingInput, AdminSymptomSpecialtyMapping } from '../types/models';

/** Provisional catalog endpoints; reconcile with docforum-core issue #67 before release. */
export function listCatalog(catalog: CatalogKind, params: { search: string; page: number; pageSize: number }, token: string, signal?: AbortSignal): Promise<AdminCatalogPage> {
  const query = new URLSearchParams({ search: params.search, page: String(params.page), pageSize: String(params.pageSize) });
  return apiFetch<AdminCatalogPage>(`/admin/catalogs/${catalog}?${query}`, { accessToken: token, signal });
}

export function createCatalogItem(catalog: CatalogKind, input: AdminCatalogInput, token: string): Promise<AdminCatalogItem> {
  return apiFetch<AdminCatalogItem>(`/admin/catalogs/${catalog}`, { method: 'POST', body: input, accessToken: token });
}

export function updateCatalogItem(catalog: CatalogKind, id: string, input: AdminCatalogInput, token: string): Promise<AdminCatalogItem> {
  return apiFetch<AdminCatalogItem>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, accessToken: token });
}

export function getCatalogUsage(catalog: CatalogKind, id: string, token: string, signal?: AbortSignal): Promise<{ usageCount: number }> {
  return apiFetch<{ usageCount: number }>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}/usage`, { accessToken: token, signal });
}

export function retireCatalogItem(catalog: CatalogKind, id: string, token: string): Promise<AdminCatalogItem> {
  return apiFetch<AdminCatalogItem>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}/retire`, { method: 'POST', body: {}, accessToken: token });
}

export function listSymptomMappings(symptomId: string, token: string, signal?: AbortSignal): Promise<AdminSymptomSpecialtyMapping[]> {
  return apiFetch<AdminSymptomSpecialtyMapping[]>(`/admin/catalogs/symptoms/${encodeURIComponent(symptomId)}/specialties`, { accessToken: token, signal });
}

export function saveSymptomMappings(symptomId: string, mappings: AdminSymptomMappingInput[], token: string): Promise<AdminSymptomSpecialtyMapping[]> {
  return apiFetch<AdminSymptomSpecialtyMapping[]>(`/admin/catalogs/symptoms/${encodeURIComponent(symptomId)}/specialties`, { method: 'PUT', body: { mappings }, accessToken: token });
}
