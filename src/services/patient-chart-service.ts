import { apiFetch } from './api-client';
import type {
  HealthEntry,
  HealthSectionKey,
  CareThread,
  Order,
  LabResult,
} from '../types/models';

export function listHealthEntries(
  patientProfileId: string,
  section: HealthSectionKey,
  accessToken: string,
  signal?: AbortSignal,
): Promise<HealthEntry[]> {
  return apiFetch<HealthEntry[]>(`/patients/${patientProfileId}/health/${section}`, { accessToken, signal });
}

export function getCareThreadById(threadId: string, accessToken: string, signal?: AbortSignal): Promise<CareThread> {
  return apiFetch<CareThread>(`/care-threads/${threadId}`, { accessToken, signal });
}

export function listActiveOrders(
  patientProfileId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Order[]> {
  return apiFetch<Order[]>(`/patients/${patientProfileId}/orders/active`, { accessToken, signal });
}

export function listRecentResults(
  patientProfileId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<LabResult[]> {
  return apiFetch<LabResult[]>(`/patients/${patientProfileId}/results/recent`, { accessToken, signal });
}
