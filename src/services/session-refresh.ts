import { refresh, type AuthSession } from './auth-service';
import { useAuthStore } from '../store/auth-store';

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
    .catch((error: unknown) => {
      // A rejected refresh means the cookie is gone/expired; keeping the
      // stale in-memory session would leave the UI looking signed in while
      // every request 401s.
      useAuthStore.getState().clearSession();
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
