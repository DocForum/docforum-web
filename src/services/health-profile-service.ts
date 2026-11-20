import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function listHealthEntries(
  patientProfileId: string,
  section: Schemas['HealthSectionKey'],
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['HealthEntry'][]> {
  return api.health.list(patientProfileId, section, { accessToken, signal });
}

export function addHealthEntry(
  patientProfileId: string,
  input: Schemas['HealthEntryInput'],
  accessToken: string,
): Promise<Schemas['HealthEntry']> {
  return api.health.add(patientProfileId, input, { accessToken });
}

export function updateHealthEntry(
  patientProfileId: string,
  entryId: string,
  input: Schemas['HealthEntryUpdate'],
  accessToken: string,
): Promise<Schemas['HealthEntry']> {
  return api.health.update(patientProfileId, entryId, input, { accessToken });
}

export function removeHealthEntry(
  patientProfileId: string,
  entryId: string,
  accessToken: string,
): Promise<void> {
  return api.health.remove(patientProfileId, entryId, { accessToken });
}
