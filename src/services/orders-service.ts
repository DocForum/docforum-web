import { apiFetch } from './api-client';
import type {
  PatientOrder,
  QualifiedOrderFacility,
  SelectOrderFacilityInput,
} from '../types/models';

export function listMyOrders(accessToken: string): Promise<PatientOrder[]> {
  return apiFetch<PatientOrder[]>('/orders/mine', { accessToken });
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
