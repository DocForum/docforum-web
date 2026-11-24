// Auth calls follow docforum-core's auth routes and controllers.
import { apiFetch } from './api-client';
import type {
  AuthSession,
  EnrollmentRequiredResponse,
  MfaRequiredResponse,
  SelfServeRole,
  TwoFactorEnableResult,
  TwoFactorSetup,
  TwoFactorStatus,
} from '../types/models';

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

export type LoginResult = AuthSession | MfaRequiredResponse | EnrollmentRequiredResponse;

export function isAuthSession(result: LoginResult): result is AuthSession {
  return 'user' in result && 'accessToken' in result;
}

export function signup(input: SignupInput): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/signup', { method: 'POST', body: input });
}

export function login(input: LoginInput): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', { method: 'POST', body: input });
}

export function verifyTwoFactor(mfaToken: string, code: string): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/2fa/verify', { method: 'POST', body: { mfaToken, code } });
}

export function setupTwoFactor(accessToken: string): Promise<TwoFactorSetup> {
  return apiFetch<TwoFactorSetup>('/auth/2fa/setup', { method: 'POST', accessToken });
}

export function enableTwoFactor(accessToken: string, code: string): Promise<TwoFactorEnableResult> {
  return apiFetch<TwoFactorEnableResult>('/auth/2fa/enable', { method: 'POST', body: { code }, accessToken });
}

export function getTwoFactorStatus(accessToken: string): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>('/auth/2fa/status', { accessToken });
}

export function disableTwoFactor(accessToken: string, code: string): Promise<void> {
  return apiFetch<void>('/auth/2fa/disable', { method: 'POST', body: { code }, accessToken });
}

export function logout(accessToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', accessToken });
}
