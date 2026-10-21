// Admin verification screens.
//
// Two queues share this service, both issue-tracked in Phase W6:
//
// — Doctor verification review queue (issue #64). The decision itself goes
//   through `PATCH /doctors/:doctorProfileId/verification` — that endpoint is
//   REAL (docforum-core's `doctors` module, admin-only, writes its AuditEvent
//   in the same transaction). Everything else is assumed: docforum-core has no
//   admin doctor listing or credential-document endpoints today, and document
//   storage is tracked there in issue #52.
//
// — Per-specialty claims review (issue #65, PRD §8.1.5). Every endpoint here
//   is assumed, pending docforum-core#51 (per-specialty credential
//   verification); the specialty catalog is assumed from docforum-core#23.
//
// Assumed shapes for both are documented in ARCHITECTURE_ESSENTIALS.md
// "Known assumptions — Phase W6".
import { apiFetch, apiFetchBlob } from './api-client';
import type {
  CredentialDocumentUrl,
  CursorPage,
  DoctorProfile,
  ReviewSpecialtyClaimInput,
  Specialty,
  SpecialtyClaim,
  VerificationDecisionInput,
  VerificationDetail,
  VerificationQueueItem,
} from '../types/models';

/** The pending queue, oldest first server-side (the console re-sorts every
 * loaded page anyway so "oldest first" holds across cursor pages). */
export function listVerifications(
  query: { cursor?: string | null },
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<VerificationQueueItem>> {
  const params = new URLSearchParams({ status: 'pending' });
  if (query.cursor) params.set('cursor', query.cursor);
  return apiFetch<CursorPage<VerificationQueueItem>>(`/admin/verifications?${params.toString()}`, {
    accessToken,
    signal,
  });
}

export function getVerification(
  doctorProfileId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<VerificationDetail> {
  return apiFetch<VerificationDetail>(`/admin/verifications/${doctorProfileId}`, { accessToken, signal });
}

/** Fresh short-lived URL for one credential document — minted per click, kept
 * in component state only, never cached (mirrors the disputes console). */
export function requestDocumentUrl(
  doctorProfileId: string,
  documentId: string,
  accessToken: string,
): Promise<CredentialDocumentUrl> {
  return apiFetch<CredentialDocumentUrl>(
    `/admin/verifications/${doctorProfileId}/documents/${documentId}/signed-url`,
    { method: 'POST', accessToken },
  );
}

/**
 * Approve or reject. The `status` half is the real contract; `reason` and
 * `expectedUpdatedAt` are sent alongside it so the decision is auditable and
 * conflict-safe the moment docforum-core persists them (its zod schema strips
 * unknown keys today — see the Known assumptions note). A `409`/`404` means
 * another admin decided first or the doctor is gone; the UI reloads instead of
 * overwriting.
 */
export function decideVerification(
  doctorProfileId: string,
  input: VerificationDecisionInput,
  accessToken: string,
): Promise<DoctorProfile> {
  return apiFetch<DoctorProfile>(`/doctors/${doctorProfileId}/verification`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

// --- Per-specialty claims review (issue #65) --------------------------------

/** Pending-age thresholds the claims queue offers, in the same duration
 * syntax docforum-core#68 uses for the stuck-referral queue. */
export type ClaimAge = '24h' | '72h' | '168h';

export interface SpecialtyClaimQuery {
  /** Server-side specialty filter; omitted means every specialty. */
  specialtyId?: string | null;
  /** Only claims at least this old; omitted means any age. */
  olderThan?: ClaimAge | null;
  cursor?: string | null;
}

/** Assumed contract (docforum-core#51 names
 * `GET /admin/specialty-verifications?status=pending` but not its envelope):
 * flat per-claim rows, oldest first, in the same `{items, nextCursor}`
 * envelope as the other admin listings. The console groups by doctor
 * client-side — each row is one doctor↔specialty pair. */
export function listSpecialtyClaims(
  query: SpecialtyClaimQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<SpecialtyClaim>> {
  const params = new URLSearchParams({ status: 'pending' });
  if (query.specialtyId) params.set('specialtyId', query.specialtyId);
  if (query.olderThan) params.set('olderThan', query.olderThan);
  if (query.cursor) params.set('cursor', query.cursor);
  return apiFetch<CursorPage<SpecialtyClaim>>(`/admin/specialty-verifications?${params.toString()}`, {
    accessToken,
    signal,
  });
}

/** The supporting document behind one claim, as the file itself. Fetched as
 * a blob so the bearer token never lands in a link href. */
export function fetchClaimCredential(claimId: string, accessToken: string, signal?: AbortSignal): Promise<Blob> {
  return apiFetchBlob(`/admin/specialty-verifications/${encodeURIComponent(claimId)}/credential`, {
    accessToken,
    signal,
  });
}

/** Approve or reject one claim. `reason` is required for rejections — the
 * doctor is told what to fix or resubmit — and optional on approval. */
export function reviewSpecialtyClaim(
  claimId: string,
  input: ReviewSpecialtyClaimInput,
  accessToken: string,
): Promise<SpecialtyClaim> {
  return apiFetch<SpecialtyClaim>(`/admin/specialty-verifications/${encodeURIComponent(claimId)}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

/** Specialty catalog for the filter dropdown (assumed — docforum-core#23's
 * specialty catalog hasn't landed; see ARCHITECTURE_ESSENTIALS.md). */
export function listSpecialties(accessToken: string, signal?: AbortSignal): Promise<Specialty[]> {
  return apiFetch<Specialty[]>('/specialties', { accessToken, signal });
}
