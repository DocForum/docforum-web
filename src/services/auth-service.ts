// Auth calls to docforum-core. Matches its real Phase 1 contract — see
// docs/api/README.md in docforum-core. `csrfToken` comes back in the body
// and must be echoed in `X-CSRF-Token` on the two cookie-authenticated
// routes (refresh/logout) per its Phase 8 CSRF contract.
import { apiFetch } from './api-client';
import type { SelfServeRole, User } from '../types/models';

export interface AuthSession {
  user: User;
  accessToken: string;
  csrfToken?: string;
}

export interface SignupInput {
  role: SelfServeRole;
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function signup(input: SignupInput): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/signup', { method: 'POST', body: input });
}

export function login(input: LoginInput): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/login', { method: 'POST', body: input });
}

export function logout(accessToken: string, csrfToken?: string | null): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', accessToken, csrfToken });
}

/** Silent re-auth using docforum-core's httpOnly refresh cookie. The cookie
 * is cross-site, so `api-client`'s `credentials: 'include'` is required. */
export function refresh(): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/refresh', { method: 'POST' });
}
