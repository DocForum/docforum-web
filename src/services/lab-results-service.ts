// Patient lab results (issue #24). ASSUMED contract against docforum-core#72
// ("Abnormal lab result escalation and doctor acknowledgement tracking"),
// which has not landed — see ARCHITECTURE_ESSENTIALS.md "Known assumptions —
// patient lab results" (docs.d/24-lab-results-viewer.md).
//
// The browser never decides whether a result is abnormal or whether a critical
// result is withheld; it renders the backend's `flag` and `status` values.
// Files are read through the authenticated API client as blobs, so no bearer
// token ever lands in a link href and no third-party viewer is loaded.
import { apiFetch, apiFetchBlob } from './api-client';
import type { LabResultDetail, LabResultSummary } from '../types/models';

export function listMyLabResults(accessToken: string, signal?: AbortSignal): Promise<LabResultSummary[]> {
  return apiFetch<LabResultSummary[]>('/patients/me/lab-results', { accessToken, signal });
}

export function getLabResult(
  resultId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<LabResultDetail> {
  return apiFetch<LabResultDetail>(`/lab-results/${resultId}`, { accessToken, signal });
}

/** The file's own `contentPath`, as returned by the detail read. */
export function getLabResultFile(
  contentPath: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return apiFetchBlob(contentPath, { accessToken, signal });
}
