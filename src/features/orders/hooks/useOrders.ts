import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';
import { orderKeys } from '../../../query-keys';
import type {
  PatientOrder,
  RouteRemainingItemsInput,
} from '../../../types/models';

/**
 * Progress changes when a facility dispenses an item (order change) or a
 * notification is sent. The query refetches on window focus and every 30s
 * while mounted, and mutations invalidate it explicitly.
 */
const PROGRESS_REFETCH_MS = 30_000;

export function useMyOrders() {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: ({ signal }) => ordersService.listMyOrders(accessToken!, signal),
    enabled: Boolean(accessToken),
  });
}

export function useOrder(orderId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ''),
    queryFn: () => ordersService.getPatientOrder(orderId!, accessToken!),
    enabled: Boolean(orderId && accessToken),
    retry: false,
  });
}

/**
 * Progress for the current order version only. Superseded versions are not
 * queried at all: their item rows describe a replaced order.
 */
export function useOrderFulfillmentProgress(
  order: Pick<PatientOrder, 'id' | 'orderType' | 'status'> | undefined,
) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: orderKeys.fulfillment(order?.id ?? '', order?.orderType ?? 'prescription'),
    queryFn: ({ signal }) =>
      ordersService.getOrderFulfillmentProgress(
        order!.id,
        order!.orderType,
        accessToken!,
        signal,
      ),
    enabled: Boolean(accessToken && order && order.status !== 'superseded'),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: PROGRESS_REFETCH_MS,
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
    queryKey: orderKeys.remainingFacilities(orderId, sortedIds),
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
      queryClient.setQueryData(orderKeys.detail(orderId), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.fulfillment(orderId, order.orderType) });
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
  });
}
