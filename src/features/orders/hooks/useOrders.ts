import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '../../../services/orders-service';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type {
  PatientOrder,
  RouteRemainingItemsInput,
  SelectOrderFacilityInput,
} from '../../../types/models';

// One list per acting profile: a guardian switching to a dependent must never
// keep seeing the previous profile's orders (issue #295).
const ORDERS_KEY = ['patient', 'orders', 'mine'] as const;
const ORDERS_KEY_FOR = (profileId: string | null) => [...ORDERS_KEY, profileId ?? 'all'] as const;
const ORDER_KEY = (orderId: string) => ['patient', 'orders', orderId] as const;
const FACILITIES_KEY = (orderId: string) => ['patient', 'orders', orderId, 'facilities'] as const;
const REMAINING_FACILITIES_KEY = (orderId: string, itemIds: string[]) =>
  ['patient', 'orders', orderId, 'remaining-items', 'facilities', [...itemIds].sort()] as const;
const FULFILLMENT_KEY = (orderId: string, orderType: PatientOrder['orderType']) =>
  ['patient', 'orders', orderId, 'fulfillment', orderType] as const;

/** Progress changes when a facility dispenses an item, so it refetches on
 * focus and periodically while mounted (#262). */
const PROGRESS_REFETCH_MS = 30_000;

/** Shared by `useMyOrders` and the route loaders that prefetch it (#112). */
export function myOrdersQueryOptions(
  accessToken: string | null,
  patientProfileId: string | null = null,
) {
  return queryOptions({
    queryKey: ORDERS_KEY_FOR(patientProfileId),
    queryFn: ({ signal }) =>
      ordersService.listMyOrders(accessToken!, signal, patientProfileId ?? undefined),
    enabled: Boolean(accessToken),
  });
}

export function useMyOrders() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);

  return useQuery(myOrdersQueryOptions(accessToken, profileId));
}

/** Shared by `useOrder` and the order detail route loader (#112). */
export function patientOrderQueryOptions(orderId: string | undefined, accessToken: string | null) {
  return queryOptions({
    queryKey: ORDER_KEY(orderId ?? ''),
    queryFn: () => ordersService.getPatientOrder(orderId!, accessToken!),
    enabled: Boolean(orderId && accessToken),
    retry: false,
  });
}

/** One order for the patient order detail page (issue #61). */
export function useOrder(orderId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery(patientOrderQueryOptions(orderId, accessToken));
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
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: SelectOrderFacilityInput }) =>
      ordersService.selectFulfillingFacility(orderId, input, accessToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData<PatientOrder[]>(ORDERS_KEY_FOR(profileId), (old) => {
        if (!old) return old;
        return old.map((order) => (order.id === updated.id ? updated : order));
      });
    },
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
    queryKey: FULFILLMENT_KEY(order?.id ?? '', order?.orderType ?? 'prescription'),
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
      queryClient.invalidateQueries({ queryKey: FULFILLMENT_KEY(orderId, order.orderType) });
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}
