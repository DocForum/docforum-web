// Account services for data export (#26) and account deletion (#27).
// All calls route through docforum-core's API per ARCHITECTURE_ESSENTIALS.md.
import { apiFetch, apiFetchBlob } from './api-client';
import type { DataExport, DeleteAccountResponse } from '../types/models';

export function requestDataExport(password: string, accessToken: string): Promise<DataExport> {
  return apiFetch<DataExport>('/account/data-export', {
    method: 'POST',
    body: { password },
    accessToken,
  });
}

export function getDataExportStatus(accessToken: string): Promise<DataExport | null> {
  return apiFetch<DataExport | null>('/account/data-export', {
    accessToken,
  });
}

export function downloadDataExport(exportId: string, accessToken: string): Promise<Blob> {
  return apiFetchBlob(`/account/data-export/${exportId}/download`, {
    accessToken,
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
