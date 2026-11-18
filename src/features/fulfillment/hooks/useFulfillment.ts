import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as fulfillmentService from '../../../services/fulfillment-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DispenseFulfillmentItemInput } from '../../../types/models';

export function useDispenseFulfillmentItem(facilityId: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string } & DispenseFulfillmentItemInput) =>
      fulfillmentService.dispenseFulfillmentItem(
        facilityId,
        itemId,
        { quantity },
        accessToken!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId, 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
