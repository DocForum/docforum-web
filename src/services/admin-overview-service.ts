// Admin operations overview (issue #68). ASSUMED contract against
// docforum-core#123 ("Admin operations overview API"), which has not landed —
// see ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6".
//
// The backend aggregates the queues; this client only reads counts, oldest
// ages and drill-down links. It never totals queue sizes from other endpoints.
import { apiFetch } from './api-client';
import type { OperationsOverview } from '../types/models';

export function getOperationsOverview(
  accessToken: string,
  signal?: AbortSignal,
): Promise<OperationsOverview> {
  return apiFetch<OperationsOverview>('/admin/overview', { accessToken, signal });
}
