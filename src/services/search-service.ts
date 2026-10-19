// Doctor search (#1) and symptom-based search (#30) service layer.
// Calls docforum-core's API per ARCHITECTURE_ESSENTIALS.md hard rule 3 —
// apiFetch is the only place HTTP details live. Every function takes an
// optional AbortSignal so the search UI can cancel in-flight requests on
// new keystrokes.
//
// Both endpoints are ASSUMED contracts — docforum-core has neither a
// doctor-list route (#23) nor the symptom vocabulary/mapping routes (#60)
// yet. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W2 —
// doctor & symptom search".
import { apiFetch } from './api-client';
import type {
  DoctorSearchQuery,
  DoctorSearchResult,
  SymptomSpecialtyMapping,
  SymptomSuggestion,
} from '../types/models';

/** The vocabulary endpoint caps its own results; the explicit limit keeps
 * the combobox popup to one short page regardless of backend behaviour. */
export const MAX_SYMPTOM_SUGGESTIONS = 8;

/**
 * Autocomplete against the controlled symptom vocabulary. `q` is the raw
 * (uncommitted) text the patient is typing — matches are substring matches
 * decided by the backend, never a client-side guess.
 */
export function searchSymptoms(
  query: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<SymptomSuggestion[]> {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return apiFetch<SymptomSuggestion[]>(
    `/symptoms?q=${encodeURIComponent(q)}&limit=${MAX_SYMPTOM_SUGGESTIONS}`,
    { accessToken, signal },
  );
}

/** The specialties a vocabulary symptom maps to, for the applied symptom. */
export function getSymptomMapping(
  slug: string,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<SymptomSpecialtyMapping> {
  return apiFetch<SymptomSpecialtyMapping>(`/symptoms/${encodeURIComponent(slug)}`, {
    accessToken,
    signal,
  });
}

/**
 * Doctors from the given specialties, filtered by availability. `any`
 * sends no availability parameter; `week`/`today` ask the backend for
 * doctors with open slots in that window.
 */
export function searchDoctors(
  query: DoctorSearchQuery,
  accessToken?: string | null,
  signal?: AbortSignal,
): Promise<DoctorSearchResult[]> {
  const queryParts: string[] = [];
  const specialtyIds = query.specialtyIds ?? [];
  if (specialtyIds.length > 0) {
    queryParts.push(`specialtyIds=${specialtyIds.map(encodeURIComponent).join(',')}`);
  }
  if (query.availability && query.availability !== 'any') {
    queryParts.push(`availability=${encodeURIComponent(query.availability)}`);
  }

  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiFetch<DoctorSearchResult[]>(`/doctors${qs}`, { accessToken, signal });
}
