// Care thread service (#28): aggregating booking, consultation, referral,
// orders, fulfillment and payment — through the generated API client.
import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function getCareThreads(
  patientProfileId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['CareThread'][]> {
  return api.careThreads.list(patientProfileId, { accessToken, signal });
}

export function getCareThreadById(
  threadId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Schemas['CareThread']> {
  return api.careThreads.get(threadId, { accessToken, signal });
}
