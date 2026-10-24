// Client-only auth session state. The access token and refresh token are
// deliberately NOT persisted to localStorage/sessionStorage (XSS
// token-theft surface) — see ARCHITECTURE_ESSENTIALS.md "No
// localStorage/sessionStorage for anything server-derived". The refresh
// token stays in docforum-core's httpOnly cookie; on reload `api-client.ts`
// exchanges it for a new access token via `POST /auth/refresh`.
//
// `csrfToken` is the one exception, and it is not a credential: the backend
// requires it in `X-CSRF-Token` on refresh/logout (Phase 8, issue #37), and
// it has to survive a reload or silent re-auth would be impossible. It is
// kept in a first-party, JS-readable cookie (see `csrf-storage.ts`) — never
// the access/refresh token.
import { create } from 'zustand';
import type { User } from '../types/models';
import { clearCsrfToken, writeCsrfToken } from '../services/csrf-storage';

/**
 * `resolving` means the boot refresh is in flight: a protected route must
 * wait for it instead of redirecting a signed-in user to /login.
 * `idle` is the pre-boot/test default; `resolved` means the boot check is
 * finished (or never needed).
 */
export type AuthStatus = 'idle' | 'resolving' | 'resolved';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** Why the last sign-out happened, while signed out. Set by the idle
   * timeout (issue #82) so the login page can explain it even when a
   * route guard's redirect wins the navigation race and drops the
   * `?reason=` query param. Cleared by `setSession`. In-memory only. */
  signOutReason: 'idle-timeout' | null;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
  signOutDueToIdle: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  signOutReason: null,
  setSession: (user, accessToken) =>
    set({ user, accessToken, signOutReason: null }),
  clearSession: () => set({ user: null, accessToken: null }),
  signOutDueToIdle: () =>
    set({ user: null, accessToken: null, signOutReason: 'idle-timeout' }),
}));
