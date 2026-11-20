import { apiFetch, apiUploadRaw } from './api-client';
import type {
  DispenseFulfillmentItemInput,
  FulfillmentQueueItem,
  FulfillmentStatusUpdate,
} from '../types/models';

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

export function updateFulfillmentStatus(
  facilityId: string,
  itemId: string,
  status: FulfillmentStatusUpdate,
  accessToken: string,
  notes?: string,
): Promise<FulfillmentQueueItem> {
  return apiFetch<FulfillmentQueueItem>(
    `/facilities/${facilityId}/fulfillment-queue/${itemId}/action`,
    {
      method: 'POST',
      body: { action: status, notes },
      accessToken,
    },
  );
}

export function uploadFulfillmentLabResult(
  _facilityId: string,
  itemId: string,
  file: File,
  accessToken: string,
  onProgress?: (percent: number) => void,
): Promise<FulfillmentQueueItem> {
  return apiUploadRaw<FulfillmentQueueItem>(
    `/orders/lab-orders/${encodeURIComponent(itemId)}/result`,
    file,
    file.type,
    { accessToken, onProgress },
  );
}

/**
 * Item-level partial dispensing (issue #54, assumed docforum-core#73).
 * The backend rejects quantities above the outstanding amount and any
 * attempt to dispense an item another facility already dispensed.
 */
export function dispenseFulfillmentItem(
  facilityId: string,
  itemId: string,
  input: DispenseFulfillmentItemInput,
  accessToken: string,
): Promise<FulfillmentQueueItem> {
  return apiFetch<FulfillmentQueueItem>(
    `/facilities/${facilityId}/fulfillment-queue/${itemId}/dispense`,
    {
      method: 'POST',
      body: input,
      accessToken,
    },
  );
}

