import type { OrderTypeForPayment } from './types/models';

/** Shared query keys, so invalidations cannot drift from the hooks. */
export const orderKeys = {
  all: ['patient', 'orders'] as const,
  list: () => [...orderKeys.all, 'mine'] as const,
  detail: (orderId: string) => [...orderKeys.all, 'detail', orderId] as const,
  /**
   * Fulfilment progress is keyed by order *and* order type: the backend
   * endpoint takes both, and a prescription/lab order can share an id
   * shape. Keys never merge two order types into one cached result.
   */
  fulfillment: (orderId: string, orderType: OrderTypeForPayment) =>
    [...orderKeys.all, 'fulfillment', orderId, orderType] as const,
  remainingFacilities: (orderId: string, itemIds: string[]) =>
    [...orderKeys.all, 'remaining-facilities', orderId, [...itemIds].sort()] as const,
};
