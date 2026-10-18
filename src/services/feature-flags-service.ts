import { apiFetch } from './api-client';
import type { FeatureFlag, UpdateFeatureFlagInput } from '../types/models';

/** Assumed contract (docforum-core#132): every flag in this environment in
 * one unpaginated list — there are tens of flags, not thousands. */
export function listFeatureFlags(accessToken: string, signal?: AbortSignal): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>('/admin/flags', { accessToken, signal });
}

/** Partial update. docforum-core records the change as an audit event and
 * answers with the flag as saved. */
export function updateFeatureFlag(key: string, input: UpdateFeatureFlagInput, accessToken: string): Promise<FeatureFlag> {
  return apiFetch<FeatureFlag>(`/admin/flags/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}
