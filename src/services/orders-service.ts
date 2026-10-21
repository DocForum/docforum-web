import { apiFetch } from './api-client';
import type {
  PatientOrder,
  QualifiedOrderFacility,
  SelectOrderFacilityInput,
} from '../types/models';

export function listMyOrders(accessToken: string, signal?: AbortSignal): Promise<PatientOrder[]> {
  return apiFetch<PatientOrder[]>('/orders/mine', { accessToken, signal });
}

/**
 * One order for the patient order detail page (issue #61). The detail
 * endpoint is assumed alongside #5's list contract — same `404`-for-
 * not-found/not-yours shape as `GET /orders/:orderId/qualified-facilities`
 * below. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Patient order
 * detail & payment panel (issue #61)".
 */
export function getPatientOrder(orderId: string, accessToken: string): Promise<PatientOrder> {
  return apiFetch<PatientOrder>(`/orders/${encodeURIComponent(orderId)}`, { accessToken });
}

export function listQualifiedFacilities(
  orderId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<QualifiedOrderFacility[]> {
  return apiFetch<QualifiedOrderFacility[]>(`/orders/${orderId}/qualified-facilities`, {
    accessToken,
    signal,
  });
}

export function selectFulfillingFacility(
  orderId: string,
  input: SelectOrderFacilityInput,
  accessToken: string,
): Promise<PatientOrder> {
  return apiFetch<PatientOrder>(`/orders/${orderId}/fulfillment-facility`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
