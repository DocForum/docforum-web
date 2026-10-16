// Order calls to docforum-core — assumed contract against issue #71
// (docforum-core/issues/71 — verifiable order tokens, PRD §8.1.6).
// Endpoints and response shapes are provisional; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions".
import { apiFetch } from './api-client';
import type { Order } from '../types/models';

/** Fetch the full order detail, including the signed token and status.
 * The token is null when the order is superseded or expired — the
 * caller must not render a QR code in those states. */
export function getOrder(id: string, accessToken: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}`, { accessToken });
}

/** Fetch all orders belonging to the authenticated patient. */
export function listMyOrders(accessToken: string): Promise<Order[]> {
  return apiFetch<Order[]>('/orders/mine', { accessToken });
}
