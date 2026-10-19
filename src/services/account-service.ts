// Account services for data export (#26) and account deletion (#27).
// All calls route through the generated @docforum/api-client (see
// packages/api-client/openapi/ for the contract).
import { api } from './api-client';
import type { DataExport, DeleteAccountResponse } from '../types/models';

export function requestDataExport(password: string, accessToken: string): Promise<DataExport> {
  return api.account.requestDataExport({ password }, { accessToken });
}

export function getDataExportStatus(accessToken: string): Promise<DataExport | null> {
  return api.account.getDataExport({ accessToken });
}

export function downloadDataExport(exportId: string, accessToken: string): Promise<Blob> {
  return api.account.downloadDataExport(exportId, { accessToken });
}

export function deleteAccount(
  password: string,
  confirmation: string,
  accessToken: string,
): Promise<DeleteAccountResponse> {
  return api.account.deleteAccount({ password, confirmation }, { accessToken });
}
