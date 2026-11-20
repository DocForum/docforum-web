// Account services for data export (#26) and account deletion (#27).
// All calls route through the generated @docforum/api-client (see
// packages/api-client/openapi/ for the contract).
import { api, SLOW_REQUEST_TIMEOUT_MS } from './api-client';
import type { DataExport } from '../types/models';

// The export is assembled server-side (every row for this account), so it
// gets the slow-endpoint budget rather than the default one.
export function requestDataExport(password: string, accessToken: string): Promise<DataExport> {
  return api.account.requestDataExport(
    { password },
    { accessToken, timeoutMs: SLOW_REQUEST_TIMEOUT_MS },
  );
}

export function getDataExportStatus(accessToken: string, signal?: AbortSignal): Promise<DataExport | null> {
  return api.account.getDataExport({ accessToken, signal });
}

export function downloadDataExport(exportId: string, accessToken: string, signal?: AbortSignal): Promise<Blob> {
  return api.account.downloadDataExport(exportId, {
    accessToken,
    signal,
    timeoutMs: SLOW_REQUEST_TIMEOUT_MS,
  });
}

// docforum-core's real contract (#41): `DELETE /patients/me` with the
// password in the body, answering `204 No Content`. The typed confirmation
// phrase is a client-side safeguard only and never leaves the browser.
export function deleteAccount(password: string, accessToken: string): Promise<void> {
  return api.account.deleteAccount({ password }, { accessToken });
}
