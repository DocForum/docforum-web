// Client-only auth session state. Deliberately NOT persisted to
// localStorage/sessionStorage (XSS token-theft surface) — see
// ARCHITECTURE_ESSENTIALS.md "No localStorage/sessionStorage for anything
// server-derived". Silent re-auth on reload uses the httpOnly refresh
// cookie via `POST /auth/refresh`; route guards await the single-flight
// `restoreSession()` below so a deep link doesn't bounce through /login.
import { create } from 'zustand';
import * as authService from '../services/auth-service';
import type { User } from '../types/models';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** Why the last sign-out happened, while signed out. Set by the idle
   * timeout (issue #82) so the login page can explain it even when a
   * route guard's redirect wins the navigation race and drops the
   * `?reason=` query param. Cleared by `setSession`. In-memory only. */
  signOutReason: 'idle-timeout' | null;
  /** True while the boot refresh is in flight. Route guards wait on it. */
  isRestoring: boolean;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
  signOutDueToIdle: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  signOutReason: null,
  isRestoring: false,
  setSession: (user, accessToken) => {
    restoreAttempted = false;
    set({ user, accessToken, signOutReason: null, isRestoring: false });
  },
  clearSession: () => {
    restoreAttempted = false;
    set({ user: null, accessToken: null, isRestoring: false });
  },
  signOutDueToIdle: () =>
    set({ user: null, accessToken: null, signOutReason: 'idle-timeout' }),
}));

let restorePromise: Promise<void> | null = null;
let restoreAttempted = false;

/**
 * Single-flight session restore used by route guards. If an access token is
 * already in memory this is a no-op; otherwise it calls `POST /auth/refresh`
 * once (the httpOnly cookie is sent with credentials) and shares that one
 * promise between every guard that boots concurrently. A failed refresh just
 * leaves the user signed out — it never blocks the app.
 */
export function restoreSession(): Promise<void> {
  if (useAuthStore.getState().user) return Promise.resolve();
  if (restorePromise) return restorePromise;
  // Once a boot refresh has failed there is no session to recover; don't
  // repeat the request on every navigation while signed out.
  if (restoreAttempted) return Promise.resolve();
  restoreAttempted = true;

  useAuthStore.setState({ isRestoring: true });
  restorePromise = authService
    .refresh()
    .then((session) => useAuthStore.getState().setSession(session.user, session.accessToken))
    .catch(() => useAuthStore.getState().clearSession())
    .finally(() => {
      restorePromise = null;
      useAuthStore.setState({ isRestoring: false });
    });

  return restorePromise;
}
