// Auth calls to docforum-core. PROVISIONAL: these paths and payload shapes
// are the smallest reasonable assumption from ARCHITECTURE.md §2 (JWT
// access + refresh, role claims) — docforum-core's auth module has no
// implemented routes yet (its backend/src/modules/auth/* is a placeholder).
// Reconcile against the real contract once docforum-core's Phase 1 lands.
import { apiFetch } from './api-client';
import type { PasswordResetMessage, SelfServeRole, User } from '../types/models';

export interface AuthSession {
  user: User;
  accessToken: string;
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

export function logout(accessToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', accessToken });
}

// Password reset is implemented in docforum-core's
// backend/src/modules/auth/routes/index.ts, controllers/index.ts,
// services/password-reset.ts, and validation.ts.
export function requestPasswordReset(email: string): Promise<PasswordResetMessage> {
  return apiFetch<PasswordResetMessage>('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetMessage> {
  return apiFetch<PasswordResetMessage>('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, newPassword },
  });
}
