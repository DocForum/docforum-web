// Account services for data export (#26) and account deletion (#27).
// All calls route through docforum-core's API per ARCHITECTURE_ESSENTIALS.md.
import { apiFetch, apiFetchBlob, SLOW_REQUEST_TIMEOUT_MS } from './api-client';
import type { DataExport, DeleteAccountResponse } from '../types/models';

// The export is assembled server-side (every row for this account), so it
// gets the slow-endpoint budget rather than the default one.
export function requestDataExport(password: string, accessToken: string): Promise<DataExport> {
  return apiFetch<DataExport>('/account/data-export', {
    method: 'POST',
    body: { password },
    accessToken,
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
}

export function getDataExportStatus(accessToken: string, signal?: AbortSignal): Promise<DataExport | null> {
  return apiFetch<DataExport | null>('/account/data-export', {
    accessToken,
    signal,
  });
}

export function downloadDataExport(exportId: string, accessToken: string, signal?: AbortSignal): Promise<Blob> {
  return apiFetchBlob(`/account/data-export/${exportId}/download`, {
    accessToken,
    signal,
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
}

export function deleteAccount(
  password: string,
  confirmation: string,
  accessToken: string,
): Promise<DeleteAccountResponse> {
  return apiFetch<DeleteAccountResponse>('/account/delete', {
    method: 'POST',
    body: { password, confirmation },
    accessToken,
  });
}
