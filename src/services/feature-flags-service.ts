import { apiFetch } from './api-client';
import type { FeatureFlag, UpdateFeatureFlagInput } from '../types/models';

/** docforum-core#132: GET /admin/feature-flags returns all flags in the
 * environment. Keys are validated as lowercase dotted segments of up to 64
 * characters; the backend returns 400 for invalid keys. */
export function listFeatureFlags(accessToken: string, signal?: AbortSignal): Promise<FeatureFlag[]> {
  return apiFetch<FeatureFlag[]>('/admin/feature-flags', { accessToken, signal });
}

/** docforum-core#132: PATCH /admin/feature-flags/:key updates a flag.
 * Validates the key format (lowercase dotted segments, max 64 chars) and
 * maps 400s to field-error objects. 409 becomes a conflict error; the
 * caller must send `expectedUpdatedAt` from the version the admin saw. */
export function updateFeatureFlag(key: string, input: UpdateFeatureFlagInput, accessToken: string): Promise<FeatureFlag> {
  return apiFetch<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}
