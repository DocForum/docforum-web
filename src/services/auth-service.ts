// Auth calls to docforum-core, routed through the generated client.
// Paths, request bodies and response shapes come from the OpenAPI fixture in
// packages/api-client/openapi/ — contract drift is a compile error here.
import type { Schemas } from '@docforum/api-client';
import { api, apiFetch } from './api-client';

export type AuthSession = Schemas['AuthSession'];
export type SignupInput = Schemas['SignupInput'];
export type LoginInput = Schemas['LoginInput'];

export function signup(input: SignupInput): Promise<AuthSession> {
  return api.auth.signup(input);
}

export function login(input: LoginInput): Promise<AuthSession> {
  return api.auth.login(input);
}

export function logout(accessToken: string): Promise<void> {
  return api.auth.logout({ accessToken });
}

/** Silent re-auth using docforum-core's httpOnly refresh cookie. The cookie
 * is cross-site, so `api-client`'s `credentials: 'include'` is required. */
export function refresh(): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/refresh', { method: 'POST' });
}
