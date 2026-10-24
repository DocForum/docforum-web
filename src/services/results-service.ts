import { apiClient } from './api-client';
import type { LabResult } from '../types/models';


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
export async function listMyLabResults(token: string, signal?: AbortSignal): Promise<LabResult[]> {
  return apiClient<LabResult[]>('/lab-results/mine', { token, signal });
}

export async function getLabResult(resultId: string, token: string, signal?: AbortSignal): Promise<LabResult> {
  return apiClient<LabResult>(`/lab-results/${resultId}`, { token, signal });
}
