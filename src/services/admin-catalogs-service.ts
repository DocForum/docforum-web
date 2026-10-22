import { apiFetch } from './api-client';
import type { CatalogInput, CatalogKind, CatalogPage, CatalogItem, SymptomMappingInput, SymptomSpecialtyMapping } from '../types/models';

/** Provisional catalog endpoints; reconcile with docforum-core issue #67 before release. */
export function listCatalog(catalog: CatalogKind, params: { search: string; page: number; pageSize: number }, token: string, signal?: AbortSignal): Promise<CatalogPage> {
  const query = new URLSearchParams({ search: params.search, page: String(params.page), pageSize: String(params.pageSize) });
  return apiFetch<CatalogPage>(`/admin/catalogs/${catalog}?${query}`, { accessToken: token, signal });
}

export function createCatalogItem(catalog: CatalogKind, input: CatalogInput, token: string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/admin/catalogs/${catalog}`, { method: 'POST', body: input, accessToken: token });
}

export function updateCatalogItem(catalog: CatalogKind, id: string, input: CatalogInput, token: string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, accessToken: token });
}

export function getCatalogUsage(catalog: CatalogKind, id: string, token: string, signal?: AbortSignal): Promise<{ usageCount: number }> {
  return apiFetch<{ usageCount: number }>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}/usage`, { accessToken: token, signal });
}

export function retireCatalogItem(catalog: CatalogKind, id: string, token: string): Promise<CatalogItem> {
  return apiFetch<CatalogItem>(`/admin/catalogs/${catalog}/${encodeURIComponent(id)}/retire`, { method: 'POST', body: {}, accessToken: token });
}

export function listSymptomMappings(symptomId: string, token: string, signal?: AbortSignal): Promise<SymptomSpecialtyMapping[]> {
  return apiFetch<SymptomSpecialtyMapping[]>(`/admin/catalogs/symptoms/${encodeURIComponent(symptomId)}/specialties`, { accessToken: token, signal });
}

export function saveSymptomMappings(symptomId: string, mappings: SymptomMappingInput[], token: string): Promise<SymptomSpecialtyMapping[]> {
  return apiFetch<SymptomSpecialtyMapping[]>(`/admin/catalogs/symptoms/${encodeURIComponent(symptomId)}/specialties`, { method: 'PUT', body: { mappings }, accessToken: token });
}
