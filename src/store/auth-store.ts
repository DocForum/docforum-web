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
  csrfToken: string | null;
  status: AuthStatus;
  /** Why the last sign-out happened, while signed out. Set by the idle
   * timeout (issue #82) so the login page can explain it even when a
   * route guard's redirect wins the navigation race and drops the
   * `?reason=` query param. Cleared by `setSession`. In-memory only. */
  signOutReason: 'idle-timeout' | null;
  setSession: (user: User, accessToken: string, csrfToken?: string) => void;
  clearSession: () => void;
  beginAuthCheck: () => void;
  endAuthCheck: () => void;
  signOutDueToIdle: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  csrfToken: null,
  status: 'idle',
  signOutReason: null,
  setSession: (user, accessToken, csrfToken) => {
    if (csrfToken) writeCsrfToken(csrfToken);
    set({
      user,
      accessToken,
      csrfToken: csrfToken ?? null,
      status: 'resolved',
      signOutReason: null,
    });
  },
  clearSession: () => {
    clearCsrfToken();
    set({ user: null, accessToken: null, csrfToken: null, status: 'resolved' });
  },
  beginAuthCheck: () => set({ status: 'resolving' }),
  endAuthCheck: () => set({ status: 'resolved' }),
  // A timeout sign-out drops the session locally without calling the API
  // (the point is to stop touching a shared machine). Clearing the CSRF
  // cookie too means a page reload cannot silently re-authenticate with
  // the still-valid refresh cookie — the user stays signed out.
  signOutDueToIdle: () => {
    clearCsrfToken();
    set({
      user: null,
      accessToken: null,
      csrfToken: null,
      status: 'resolved',
      signOutReason: 'idle-timeout',
    });
  },
}));
