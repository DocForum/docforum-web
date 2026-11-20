import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as fulfillmentService from '../../../services/fulfillment-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FulfillmentStatusUpdate } from '../../../types/models';

function queueKey(facilityId: string) {
  return ['facility', facilityId, 'fulfillment-queue'] as const;
}

export function useFacilityQueue(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queueKey(facilityId),
    queryFn: ({ signal }) =>
      fulfillmentService.listFulfillmentQueue(facilityId, accessToken!, signal),
    enabled: Boolean(accessToken && facilityId),
  });
}

export function useUpdateFulfillmentStatus(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      status,
      notes,
    }: {
      itemId: string;
      status: FulfillmentStatusUpdate;
      notes?: string;
    }) =>
      fulfillmentService.updateFulfillmentStatus(
        facilityId,
        itemId,
        status,
        accessToken!,
        notes,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKey(facilityId) });
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
      queryClient.invalidateQueries({ queryKey: queueKey(facilityId) });
    },
  });
}
