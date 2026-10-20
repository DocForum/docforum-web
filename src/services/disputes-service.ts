// Fulfilment disputes, admin side (issue #76).
//
// ASSUMED contract: docforum-core#76 (facility fulfilment proof + patient
// receipt confirmation/dispute) has not landed. The endpoint paths and shapes
// below are the smallest contract this console needs; they are recorded in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions" and mirrored in
// src/types/models.ts. Every call goes through docforum-core's API — this repo
// never calls Stellar directly (hard rule 1).
import { apiFetch } from './api-client';
import type {
  CursorPage,
  DisputeAttachmentUrl,
  FulfillmentDispute,
  FulfillmentDisputeSummary,
  ResolveDisputeInput,
} from '../types/models';

export interface DisputeQueueQuery {
  status: 'open';
  cursor?: string | null;
}

/** Open disputes, oldest first (the console re-sorts across loaded pages). */
export function listDisputes(
  query: DisputeQueueQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<FulfillmentDisputeSummary>> {
  const params = new URLSearchParams({ status: query.status });
  if (query.cursor) params.set('cursor', query.cursor);
  return apiFetch<CursorPage<FulfillmentDisputeSummary>>(`/admin/disputes?${params.toString()}`, {
    accessToken,
    signal,
  });
}

export function getDispute(disputeId: string, accessToken: string, signal?: AbortSignal): Promise<FulfillmentDispute> {
  return apiFetch<FulfillmentDispute>(`/admin/disputes/${encodeURIComponent(disputeId)}`, { accessToken, signal });
}

/** Final: the server releases the held escrow to the facility or refunds the
 * patient. `expectedUpdatedAt` turns a concurrent resolution into a 409. */
export function resolveDispute(
  disputeId: string,
  input: ResolveDisputeInput,
  accessToken: string,
): Promise<FulfillmentDispute> {
  return apiFetch<FulfillmentDispute>(`/admin/disputes/${encodeURIComponent(disputeId)}/resolve`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Minted on demand; responses are never cached (the URL expires quickly). */
export function getAttachmentSignedUrl(
  disputeId: string,
  attachmentId: string,
  accessToken: string,
): Promise<DisputeAttachmentUrl> {
  return apiFetch<DisputeAttachmentUrl>(
    `/admin/disputes/${encodeURIComponent(disputeId)}/attachments/${encodeURIComponent(attachmentId)}/signed-url`,
    { method: 'POST', accessToken },
  );
}
