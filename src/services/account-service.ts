// Account services for data export (#26) and account deletion (#27).
// All calls route through the generated @docforum/api-client (see
// packages/api-client/openapi/ for the contract).
import { api, SLOW_REQUEST_TIMEOUT_MS } from './api-client';
import type { DataExport } from '../types/models';

// docforum-core's real contract (#40): `POST /patients/me/export` starts an
// export of the caller's own data and reads no body. It answers `202` with the
// export status object, whose `id` is the only way to poll or download it —
// there is no list endpoint. The export is assembled server-side (every row
// for this account), so it gets the slow-endpoint budget.
export function requestDataExport(accessToken: string): Promise<DataExport> {
  return api.account.requestDataExport({ accessToken, timeoutMs: SLOW_REQUEST_TIMEOUT_MS });
}

export function getDataExportStatus(
  exportId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<DataExport> {
  return api.account.getDataExportStatus(exportId, { accessToken, signal });
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
