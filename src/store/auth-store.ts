// Client-only auth session state. Deliberately NOT persisted to
// localStorage/sessionStorage (XSS token-theft surface) — see
// ARCHITECTURE_ESSENTIALS.md "No localStorage/sessionStorage for anything
// server-derived". Silent re-auth on reload is not built yet: docforum-core
// sends the refresh token as an httpOnly cookie (`POST /auth/refresh`), but
// nothing here calls it — see ARCHITECTURE_ESSENTIALS.md "Known gaps".
import { create } from 'zustand';
import type { User } from '../types/models';

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
