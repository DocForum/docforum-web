// Care thread service (#28): aggregating booking, consultation, referral, orders, fulfillment, and payment.
// All calls route through docforum-core's API per ARCHITECTURE_ESSENTIALS.md.
import { apiFetch } from './api-client';
import type { CareThread } from '../types/models';

export function getCareThreads(patientProfileId: string, accessToken: string): Promise<CareThread[]> {
  return apiFetch<CareThread[]>(`/patients/${patientProfileId}/care-threads`, {
    accessToken,
  });
}

export function getCareThreadById(threadId: string, accessToken: string): Promise<CareThread> {
  return apiFetch<CareThread>(`/care-threads/${threadId}`, {
    accessToken,
  });
}
