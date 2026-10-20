// Admin fulfilment-dispute calls to docforum-core (assumed contract — see
// the "Fulfilment disputes" section of `src/types/models.ts` and
// ARCHITECTURE_ESSENTIALS.md "Known assumptions"). Payment release/refund
// happens server-side inside docforum-core; this repo never touches escrow
// or Stellar directly (hard rule 1).
import { apiFetch } from './api-client';
import type {
  CursorPage,
  FulfillmentDisputeDetail,
  FulfillmentDisputeSummary,
  ResolveDisputeInput,
  SignedAttachmentUrl,
} from '../types/models';

/** `GET /admin/disputes?status=open&cursor=` — oldest first, same
 * `{items, nextCursor}` envelope as the other admin listings. */
export function listOpenDisputes(
  cursor: string | null,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<FulfillmentDisputeSummary>> {
  const params = new URLSearchParams({ status: 'open' });
  if (cursor) params.set('cursor', cursor);
  return apiFetch<CursorPage<FulfillmentDisputeSummary>>(`/admin/disputes?${params.toString()}`, {
    accessToken,
    signal,
  });
}

/** `GET /admin/disputes/:id` — report, facility proof, attachment metadata
 * (no URLs) and timeline. */
export function getDispute(
  disputeId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FulfillmentDisputeDetail> {
  return apiFetch<FulfillmentDisputeDetail>(`/admin/disputes/${encodeURIComponent(disputeId)}`, {
    accessToken,
    signal,
  });
}

/** `POST /admin/disputes/:id/attachments/:attachmentId/signed-url` — mints
 * a fresh, short-lived URL. Called once per open; never cached. */
export function createAttachmentUrl(
  disputeId: string,
  attachmentId: string,
  accessToken: string,
): Promise<SignedAttachmentUrl> {
  return apiFetch<SignedAttachmentUrl>(
    `/admin/disputes/${encodeURIComponent(disputeId)}/attachments/${encodeURIComponent(attachmentId)}/signed-url`,
    { method: 'POST', accessToken },
  );
}

/** `POST /admin/disputes/:id/resolve` — final. `expectedUpdatedAt` turns a
 * race with another admin into a `409`. */
export function resolveDispute(
  disputeId: string,
  input: ResolveDisputeInput,
  accessToken: string,
): Promise<FulfillmentDisputeDetail> {
  return apiFetch<FulfillmentDisputeDetail>(`/admin/disputes/${encodeURIComponent(disputeId)}/resolve`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
