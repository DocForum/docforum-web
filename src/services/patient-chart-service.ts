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
): Promise<HealthEntry[]> {
  return apiFetch<HealthEntry[]>(`/patients/${patientProfileId}/health/${section}`, { accessToken });
}

export function getCareThreadById(threadId: string, accessToken: string): Promise<CareThread> {
  return apiFetch<CareThread>(`/care-threads/${threadId}`, { accessToken });
}

export function listActiveOrders(
  patientProfileId: string,
  accessToken: string,
): Promise<Order[]> {
  return apiFetch<Order[]>(`/patients/${patientProfileId}/orders/active`, { accessToken });
}

export function listRecentResults(
  patientProfileId: string,
  accessToken: string,
): Promise<LabResult[]> {
  return apiFetch<LabResult[]>(`/patients/${patientProfileId}/results/recent`, { accessToken });
}
