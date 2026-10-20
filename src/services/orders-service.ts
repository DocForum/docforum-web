import { apiFetch } from './api-client';
import type {
  PatientOrder,
  QualifiedOrderFacility,
  SelectOrderFacilityInput,
} from '../types/models';

export function listMyOrders(accessToken: string): Promise<PatientOrder[]> {
  return apiFetch<PatientOrder[]>('/orders/mine', { accessToken });
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
): Promise<QualifiedOrderFacility[]> {
  return apiFetch<QualifiedOrderFacility[]>(`/orders/${orderId}/qualified-facilities`, {
    accessToken,
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
