import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as fulfillmentService from '../../../services/fulfillment-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';
import { facilityKeys } from '../../../query-keys';
import type { FulfillmentStatusUpdate } from '../../../types/models';

export function useFacilityQueue(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: facilityKeys.queue(facilityId),
    queryFn: ({ signal }) =>
      fulfillmentService.listFulfillmentQueue(facilityId, accessToken!, signal),
    enabled: Boolean(accessToken && facilityId),
  });
}

/**
 * Record-level status (issue #269): only `in_progress` or `rejected`.
 * `fulfilled` is derived by docforum-core from the record's dispensed items
 * and is not a value this client can send.
 */
export function useUpdateFulfillmentRecord(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status }: { recordId: string; status: FulfillmentStatusUpdate }) =>
      fulfillmentService.updateFulfillmentRecord(recordId, status, accessToken!),
    // A 409 means the row moved under us — refresh on failure too, so the
    // panel shows the state that actually won.
    onSuccess: () => {
      void invalidateFor(queryClient, 'facility.fulfillment-action', facilityId);
    },
    onError: () => {
      void invalidateFor(queryClient, 'facility.fulfillment-action', facilityId);
    },
  });
}

/**
 * Item-level dispensing. One-shot per item: never retried automatically, and
 * a `409` means another facility (or an earlier attempt) already closed it.
 */
export function useDispenseFulfillmentItem(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      itemId,
      quantity,
    }: {
      recordId: string;
      itemId: string;
      quantity: number;
    }) =>
      fulfillmentService.dispenseFulfillmentItem(
        recordId,
        itemId,
        { quantity },
        accessToken!,
      ),
    onSuccess: () => {
      void invalidateFor(queryClient, 'facility.fulfillment-action', facilityId);
    },
    onError: () => {
      void invalidateFor(queryClient, 'facility.fulfillment-action', facilityId);
    },
  });
}

export function useUploadLabResult(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: string; file: File }) =>
      fulfillmentService.uploadFulfillmentLabResult(facilityId, itemId, file, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.queue(facilityId) });
    },
  });
}
