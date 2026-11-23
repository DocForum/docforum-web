import { apiFetch, apiFetchForm } from './api-client';
import type {
  DispenseFulfillmentItemInput,
  FulfillmentItemUpdateResult,
  FulfillmentQueueItem,
  FulfillmentStatusUpdate,
  PharmacyFulfillmentRecord,
} from '../types/models';

/**
 * The facility's live fulfillment queue. Still an assumed contract: core has
 * no queue-listing endpoint yet, so it must carry `fulfillmentRecordId` /
 * `fulfillmentItemId` for the real PATCH calls below (issue #269).
 */
export function listFulfillmentQueue(
  facilityId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FulfillmentQueueItem[]> {
  return apiFetch<FulfillmentQueueItem[]>(`/facilities/${facilityId}/fulfillment-queue`, {
    accessToken,
    signal,
  });
}

/**
 * Record-level status (issue #269): `PATCH /pharmacy-orders/fulfillments/:id`
 * accepts only `in_progress` or `rejected`. `fulfilled` is derived from the
 * record's dispensed items by docforum-core and cannot be set here.
 */
export function updateFulfillmentRecord(
  recordId: string,
  status: FulfillmentStatusUpdate,
  accessToken: string,
): Promise<PharmacyFulfillmentRecord> {
  return apiFetch<PharmacyFulfillmentRecord>(
    `/pharmacy-orders/fulfillments/${encodeURIComponent(recordId)}`,
    {
      method: 'PATCH',
      body: { status },
      accessToken,
    },
  );
}

/**
 * Item-level dispensing (issue #269). One-shot: a terminal item can never
 * change again, and another facility dispensing the same order item comes
 * back as `409` (enforced by a DB constraint in docforum-core).
 *
 * A PATCH is never retried automatically after a timeout: the client cannot
 * know whether the write landed, so the queue must be refreshed before the
 * admin tries again.
 */
export function dispenseFulfillmentItem(
  recordId: string,
  itemId: string,
  input: DispenseFulfillmentItemInput,
  accessToken: string,
): Promise<FulfillmentItemUpdateResult> {
  return apiFetch<FulfillmentItemUpdateResult>(
    `/pharmacy-orders/fulfillments/${encodeURIComponent(recordId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: { status: 'dispensed', quantityDispensed: input.quantity },
      accessToken,
      retry: false,
    },
  );
}

/** Mark one item `unfulfilled` (the facility could not supply it). */
export function markFulfillmentItemUnfulfilled(
  recordId: string,
  itemId: string,
  accessToken: string,
): Promise<FulfillmentItemUpdateResult> {
  return apiFetch<FulfillmentItemUpdateResult>(
    `/pharmacy-orders/fulfillments/${encodeURIComponent(recordId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: 'PATCH',
      body: { status: 'unfulfilled' },
      accessToken,
      retry: false,
    },
  );
}

/**
 * Assumed contract: lab-result upload stays on the facility queue path until
 * docforum-core exposes a fulfillment-item attachment route. The transport
 * is a real multipart upload; the object-storage provider is still undecided
 * (docforum-core#16).
 */
export function uploadFulfillmentLabResult(
  facilityId: string,
  itemId: string,
  file: File,
  accessToken: string,
): Promise<FulfillmentQueueItem> {
  const formData = new FormData();
  formData.append('file', file);

  return apiFetchForm<FulfillmentQueueItem>(
    `/facilities/${facilityId}/fulfillment-queue/${itemId}/lab-result`,
    formData,
    { accessToken },
  );
}
