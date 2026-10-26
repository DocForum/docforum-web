// Order calls to docforum-core — assumed contract against issues #5 and #71.
// Issue #5: orders list + facility selection (docforum-core/issues/9–16).
// Issue #71: verifiable order tokens, PRD §8.1.6.
// Issue #35: patient confirm receipt / report problem.
// Endpoints and response shapes are provisional; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions".
import { apiFetch } from './api-client';
import type {
  ConfirmReceiptInput,
  ConfirmReceiptResponse,
  Order,
  PatientOrder,
  QualifiedOrderFacility,
  ReportProblemInput,
  ReportProblemResponse,
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

/** Fetch the full order detail, including the signed token and status.
 * The token is null when the order is superseded or expired — the
 * caller must not render a QR code in those states. */
export function getOrder(id: string, accessToken: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${encodeURIComponent(id)}`, { accessToken });
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

/** Patient confirms receipt of a fulfilled order (issue #35). */
export function confirmReceipt(
  input: ConfirmReceiptInput,
  accessToken: string,
): Promise<ConfirmReceiptResponse> {
  return apiFetch<ConfirmReceiptResponse>('/orders/confirm-receipt', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Patient reports a problem with a fulfilled order (issue #35). */
export function reportProblem(
  input: ReportProblemInput,
  accessToken: string,
): Promise<ReportProblemResponse> {
  return apiFetch<ReportProblemResponse>('/orders/report-problem', {
    method: 'POST',
    body: input,
    accessToken,
  });
}
