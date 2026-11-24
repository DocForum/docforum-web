import { apiFetch } from './api-client';
import type { AbnormalResult, AcknowledgeResultInput } from '../types/models';

export function listPendingAbnormalResults(accessToken: string, signal?: AbortSignal): Promise<AbnormalResult[]> {
  return apiFetch<AbnormalResult[]>('/doctor/results/pending-abnormal', { accessToken, signal });
}

export function acknowledgeAbnormalResult(
  resultId: string,
  input: AcknowledgeResultInput,
  accessToken: string,
): Promise<void> {
  return apiFetch<void>(`/doctor/results/${resultId}/acknowledge`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
