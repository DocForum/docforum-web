// Boot-time session restore (issue #9). Kicked off from `main.tsx` without
// awaiting it, so the app can render its "restoring session" state instead
// of a blank page while a cold-started Render instance wakes up.
import { useAuthStore } from '../store/auth-store';
import { refreshSession } from './api-client';

let bootInFlight: Promise<void> | null = null;

/**
 * Restore the session from the httpOnly refresh cookie once per page load.
 *
 * - Already signed in (mock mode, `?previewRole=`, or a login that beat the
 *   boot call) → nothing to do; mark the auth check resolved immediately.
 * - Otherwise mark `resolving`, attempt the refresh, and always resolve the
 *   status afterwards, whether the cookie was valid, expired, or the
 *   network was unavailable.
 */
export function bootstrapSession(): Promise<void> {
  const state = useAuthStore.getState();
  if (state.user) {
    state.endAuthCheck();
    return Promise.resolve();
  }
  if (!bootInFlight) {
    state.beginAuthCheck();
    bootInFlight = refreshSession()
      .then(() => undefined)
      .finally(() => {
        bootInFlight = null;
        useAuthStore.getState().endAuthCheck();
      });
  }
  return bootInFlight;
}
