import { apiFetch, apiFetchBlob } from './api-client';
import type { CursorPage, ReviewSpecialtyClaimInput, Specialty, SpecialtyClaim } from '../types/models';

/** Pending-age thresholds the queue offers, in the same duration syntax
 * docforum-core#68 uses for the stuck-referral queue. */
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

/** The supporting document behind one claim, as the file itself. Authored
 * as a blob so the bearer token never lands in a link href. */
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
