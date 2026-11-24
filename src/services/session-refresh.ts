import { refresh, type AuthSession } from './auth-service';
import { useAuthStore } from '../store/auth-store';
import { signOut } from './sign-out';

/**
 * Single-flight token refresh (shared by the SSE connection manager and
 * any future boot refresh). Concurrent callers — two event streams, a
 * reconnect racing a focus event — join one request, so docforum-core only
 * rotates the refresh cookie once.
 */
let inFlight: Promise<AuthSession> | null = null;

export function refreshSessionSingleFlight(): Promise<AuthSession> {
  if (inFlight) return inFlight;

  inFlight = refresh()
    .then((session) => {
      useAuthStore.getState().setSession(session.user, session.accessToken);
      return session;
    })
    .catch(async (error: unknown) => {
      // A rejected refresh means the cookie is gone/expired; keeping the
      // stale in-memory session would leave the UI looking signed in while
      // every request 401s. Clear all client state, not just the token
      // (issue #227).
      await signOut('session-expired');
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Test-only: drop any in-flight promise between cases. */
export function resetRefreshSingleFlight(): void {
  inFlight = null;
}
