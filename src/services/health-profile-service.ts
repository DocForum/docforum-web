import { apiFetch } from './api-client';
import type { HealthEntry, HealthEntryInput, HealthSectionKey } from '../types/models';

export function listHealthEntries(
  patientProfileId: string,
  section: HealthSectionKey,
  accessToken: string,
): Promise<HealthEntry[]> {
  return apiFetch<HealthEntry[]>(`/patients/${patientProfileId}/health/${section}`, { accessToken });
}

export function addHealthEntry(
  patientProfileId: string,
  input: HealthEntryInput,
  accessToken: string,
): Promise<HealthEntry> {
  return apiFetch<HealthEntry>(`/patients/${patientProfileId}/health`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function updateHealthEntry(
  patientProfileId: string,
  entryId: string,
  input: Omit<HealthEntryInput, 'section'>,
  accessToken: string,
): Promise<HealthEntry> {
  return apiFetch<HealthEntry>(`/patients/${patientProfileId}/health/${entryId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

export function removeHealthEntry(
  patientProfileId: string,
  entryId: string,
  accessToken: string,
): Promise<void> {
  return apiFetch<void>(`/patients/${patientProfileId}/health/${entryId}`, {
    method: 'DELETE',
    accessToken,
  });
}
