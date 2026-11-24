// Auth calls to docforum-core. Every request goes through apiFetch so the
// API base URL, credentials and error envelope stay centralized.
import { apiFetch } from './api-client';
import type {
  EmailVerificationResendResult,
  EmailVerificationResult,
  SelfServeRole,
  User,
} from '../types/models';

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

// Contract source: docforum-core backend/src/modules/auth/routes/index.ts and
// backend/src/modules/auth/controllers/index.ts (verify-email endpoints).
export function verifyEmail(token: string): Promise<EmailVerificationResult> {
  return apiFetch<EmailVerificationResult>('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
}

export function resendVerificationEmail(
  accessToken: string,
): Promise<EmailVerificationResendResult> {
  return apiFetch<EmailVerificationResendResult>('/auth/verify-email/resend', {
    method: 'POST',
    accessToken,
  });
}
