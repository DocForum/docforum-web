import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as fulfillmentService from '../../../services/fulfillment-service';
import { useAuthStore } from '../../../store/auth-store';
import { invalidateFor } from '../../../invalidations';

/**
 * Item-level dispensing through the real
 * `PATCH /pharmacy-orders/fulfillments/:recordId/items/:itemId` (issue #269).
 * The component that owns the queue uses `useFacilityQueue`'s mutation; this
 * hook remains for callers that already hold a fulfillment record id.
 */
export function useDispenseFulfillmentItem(facilityId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
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
