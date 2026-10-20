import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';
import type { PatientOrder, SelectOrderFacilityInput } from '../../../types/models';

const ORDERS_KEY = ['patient', 'orders'] as const;
const FACILITIES_KEY = (orderId: string) => ['patient', 'orders', orderId, 'facilities'] as const;

export function useMyOrders() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: () => ordersService.listMyOrders(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useQualifiedFacilities(orderId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: FACILITIES_KEY(orderId ?? ''),
    queryFn: () => ordersService.listQualifiedFacilities(orderId!, accessToken!),
    enabled: Boolean(accessToken && orderId),
  });
}

export function useSelectFulfillingFacility() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: SelectOrderFacilityInput }) =>
      ordersService.selectFulfillingFacility(orderId, input, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData<PatientOrder[]>(ORDERS_KEY, (old) => {
        if (!old) return old;
        return old.map((order) => (order.id === updated.id ? updated : order));
      });
    },
  });
}
