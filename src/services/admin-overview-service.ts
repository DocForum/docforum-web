import { apiFetch } from './api-client';
import type { AdminOverview } from '../types/models';

/**
 * Assumed contract (docforum-core#123, not landed): `GET /admin/overview`
 * aggregates every attention queue — verifications, stuck referrals,
 * unrouted orders, stuck payments, failed jobs, open disputes — through a
 * backend registry, in one call. Sections that fail come back with
 * `available: false` instead of failing the response; a whole-endpoint
 * `404` means docforum-core doesn't serve the overview yet, which the
 * board shows as a muted notice rather than an error page.
 */
export function getAdminOverview(accessToken: string, signal?: AbortSignal): Promise<AdminOverview> {
  return apiFetch<AdminOverview>('/admin/overview', { accessToken, signal });
}
