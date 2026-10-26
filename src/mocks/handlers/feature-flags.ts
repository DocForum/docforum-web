// Evaluated flags for the signed-in user (issue #111). Mock mode returns
// the same safe defaults the real backend is assumed to send, with
// dev-panel overrides layered on top.
import { http } from 'msw';
import { KNOWN_FLAGS, type FlagName } from '../../features/feature-flags/flags';
import { useMockStore } from '../mock-store';
import { respond } from '../helpers';

/** Mock rollout defaults: new W7 surfaces are on, so the dev panel can be
 * used to exercise route/nav gating from a known-good starting point. */
export const MOCK_FLAG_DEFAULTS: Record<FlagName, boolean> = {
  notification_preferences: true,
  realtime_updates: false,
};

export function currentEvaluatedFlags(): Record<string, boolean> {
  const { flagOverrides } = useMockStore.getState();
  return {
    ...MOCK_FLAG_DEFAULTS,
    ...Object.fromEntries(KNOWN_FLAGS.filter((key) => key in flagOverrides).map((key) => [key, flagOverrides[key]])),
  };
}

export const featureFlagHandlers = [
  http.get(
    '*/me/flags',
    respond('json', () => ({
      flags: currentEvaluatedFlags(),
      evaluatedAt: new Date().toISOString(),
    })),
  ),
];
