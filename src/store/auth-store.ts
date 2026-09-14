// Client-only auth session state. Deliberately NOT persisted to
// localStorage/sessionStorage (XSS token-theft surface) — see
// ARCHITECTURE_ESSENTIALS.md "No localStorage/sessionStorage for anything
// server-derived". Refresh-token handling (silent re-auth on reload) is a
// TODO — docforum-core hasn't decided its refresh-token transport
// (header vs. httpOnly cookie) yet.
import { create } from 'zustand';
import type { User } from '../types/models';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
}));
