import { apiFetch } from './api-client';
import type { EvaluatedFlags } from '../types/models';

/**
 * The signed-in user's evaluated flags (issue #111). Assumed contract
 * pending docforum-core#132: rollout targeting and percentage buckets are
 * evaluated server-side; this repo only reads the resulting booleans.
 */
export function getMyFlags(accessToken: string, signal?: AbortSignal): Promise<EvaluatedFlags> {
  return apiFetch<EvaluatedFlags>('/me/flags', { accessToken, signal });
}
