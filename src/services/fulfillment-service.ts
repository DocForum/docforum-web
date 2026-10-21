import { apiFetch, apiFetchForm } from './api-client';
import type {
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
