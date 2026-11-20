// Patient orders calls to docforum-core (issue #5) plus item-level
// fulfilment progress (issue #262). The progress endpoint is real:
// `GET /pharmacy-orders/orders/:orderId/fulfillment-status?orderType=`
// returns `{ totalItems, dispensedItems, status }` derived from item rows.
// The remaining-items calls are the existing #54 assumed contract, kept so
// a partially filled order can route what is left.
import { apiFetch } from './api-client';
import type {
  FacilityWithDistance,
  OrderFulfillmentProgress,
  OrderTypeForPayment,
  PatientOrder,
  RouteRemainingItemsInput,
} from '../types/models';

export function listMyOrders(accessToken: string, signal?: AbortSignal): Promise<PatientOrder[]> {
  return apiFetch<PatientOrder[]>('/orders/mine', { accessToken, signal });
}

export function getPatientOrder(orderId: string, accessToken: string): Promise<PatientOrder> {
  return apiFetch<PatientOrder>(`/orders/${encodeURIComponent(orderId)}`, { accessToken });
}

/**
 * Item-level fulfilment progress for one order version (#262). `orderType`
 * is sent as the order's own `prescription` / `lab_order` value; see
 * docs.d/262-order-fulfilment-progress.md for the assumed parameter values.
 */
export function getOrderFulfillmentProgress(
  orderId: string,
  orderType: OrderTypeForPayment,
  accessToken: string,
  signal?: AbortSignal,
): Promise<OrderFulfillmentProgress> {
  const query = new URLSearchParams({ orderType });
  return apiFetch<OrderFulfillmentProgress>(
    `/pharmacy-orders/orders/${encodeURIComponent(orderId)}/fulfillment-status?${query.toString()}`,
    { accessToken, signal },
  );
}

/** Facilities qualified to dispense only the outstanding items (issue #54). */
export function getEligibleFacilitiesForRemainingItems(
  orderId: string,
  itemIds: string[],
  accessToken: string,
): Promise<FacilityWithDistance[]> {
  const query = new URLSearchParams({ itemIds: itemIds.join(',') });
  return apiFetch<FacilityWithDistance[]>(
    `/orders/${encodeURIComponent(orderId)}/remaining-items/facilities?${query.toString()}`,
    { accessToken },
  );
}

/** Routes the remaining quantities to a second facility (issue #54). */
export function routeRemainingItems(
  orderId: string,
  input: RouteRemainingItemsInput,
  accessToken: string,
): Promise<PatientOrder> {
  return apiFetch<PatientOrder>(`/orders/${encodeURIComponent(orderId)}/route-remaining`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
