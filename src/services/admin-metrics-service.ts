import type { AdminSuccessMetrics } from '../types/models';
import { apiFetch } from './api-client';

export function getAdminSuccessMetrics(
  from: string,
  to: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<AdminSuccessMetrics> {
  const query = new URLSearchParams({ from, to });
  return apiFetch(`/admin/metrics?${query}`, { accessToken, signal });
}
