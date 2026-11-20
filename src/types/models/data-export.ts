// --- Data export (Phase W2, issue #26 — docforum-core#40) -------------------
// Mirrors docforum-core's status object. `id` is the only handle the client
// has: there is no list endpoint, so an export can only be tracked from the
// 202 that created it (or a `Location`/status URL carrying the same id).

export type DataExportStatus = 'pending' | 'processing' | 'ready' | 'expired' | 'failed';

export interface DataExportFailure {
  code: string;
  section?: string | null;
}

export interface DataExport {
  id: string;
  status: DataExportStatus;
  schemaVersion: number;
  createdAt: string;
  startedAt?: string | null;
  generatedAt?: string | null;
  expiresAt?: string | null;
  sizeBytes?: number | null;
  failure?: DataExportFailure | null;
  downloadUrl?: string | null;
}
