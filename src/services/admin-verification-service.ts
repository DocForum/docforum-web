// Doctor verification review queue (issue #64).
//
// The decision itself goes through `PATCH /doctors/:doctorProfileId/verification`
// — that endpoint is REAL (docforum-core's `doctors` module, admin-only, writes
// its AuditEvent in the same transaction). Everything else here is assumed:
// docforum-core has no admin doctor listing or credential-document endpoints
// today, and document storage is tracked there in issue #52. Assumed shapes are
// documented in ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".
import { apiFetch } from './api-client';
import type {
  CredentialDocumentUrl,
  CursorPage,
  DoctorProfile,
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
