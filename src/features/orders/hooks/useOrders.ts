import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';
import type {
  PatientOrder,
  RouteRemainingItemsInput,
  SelectOrderFacilityInput,
} from '../../../types/models';

const ORDERS_KEY = ['patient', 'orders'] as const;
const ORDER_KEY = (orderId: string) => ['patient', 'orders', orderId] as const;
const FACILITIES_KEY = (orderId: string) => ['patient', 'orders', orderId, 'facilities'] as const;
const REMAINING_FACILITIES_KEY = (orderId: string, itemIds: string[]) =>
  ['patient', 'orders', orderId, 'remaining-items', 'facilities', [...itemIds].sort()] as const;

export function useMyOrders() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: ({ signal }) => ordersService.listMyOrders(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

/** One order for the patient order detail page (issue #61). */
export function useOrder(orderId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ORDER_KEY(orderId ?? ''),
    queryFn: () => ordersService.getPatientOrder(orderId!, accessToken!),
    enabled: Boolean(orderId && accessToken),
    retry: false,
  });
}

export function useQualifiedFacilities(orderId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: FACILITIES_KEY(orderId ?? ''),
    queryFn: ({ signal }) =>
      ordersService.listQualifiedFacilities(orderId!, accessToken!, signal),
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

/** Facilities qualified for the outstanding items only (issue #54). */
export function useEligibleFacilitiesForRemainingItems(
  orderId: string,
  itemIds: string[],
  enabled: boolean,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const sortedIds = [...itemIds].sort();

  return useQuery({
    queryKey: REMAINING_FACILITIES_KEY(orderId, sortedIds),
    queryFn: () =>
      ordersService.getEligibleFacilitiesForRemainingItems(orderId, sortedIds, accessToken!),
    enabled: Boolean(enabled && accessToken && orderId && sortedIds.length > 0),
  });
}

/** Routes the remaining quantities to a second facility (issue #54). */
export function useRouteRemainingItems(orderId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RouteRemainingItemsInput) =>
      ordersService.routeRemainingItems(orderId, input, accessToken!),
    onSuccess: (order) => {
      queryClient.setQueryData(ORDER_KEY(orderId), order);
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}
