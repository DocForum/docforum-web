// Auth calls to docforum-core, routed through the generated client.
// Paths, request bodies and response shapes come from the OpenAPI fixture in
// packages/api-client/openapi/ — contract drift is a compile error here.
import type { Schemas } from '@docforum/api-client';
import { api, apiFetch } from './api-client';
import type {
  AccountInvite,
  ActiveSession,
  EmailVerificationResendResult,
  EmailVerificationResult,
  EnrollmentRequiredResponse,
  MfaRequiredResponse,
  PasswordResetMessage,
  RevokeOtherSessionsResult,
  TwoFactorEnableResult,
  TwoFactorSetup,
  TwoFactorStatus,
} from '../types/models';

export type AuthSession = Schemas['AuthSession'] & { csrfToken?: string };
export type SignupInput = Schemas['SignupInput'];
export type LoginInput = Schemas['LoginInput'];

export type LoginResult = AuthSession | MfaRequiredResponse | EnrollmentRequiredResponse;

export function isAuthSession(result: LoginResult): result is AuthSession {
  return 'user' in result && 'accessToken' in result;
}

export function signup(input: SignupInput): Promise<AuthSession> {
  return api.auth.signup(input);
}

export function login(input: LoginInput): Promise<LoginResult> {
  return apiFetch<LoginResult>('/auth/login', { method: 'POST', body: input });
}

export function logout(accessToken: string, csrfToken?: string | null): Promise<void> {
  if (csrfToken) {
    return apiFetch<void>('/auth/logout', { method: 'POST', accessToken, csrfToken });
  }
  return api.auth.logout({ accessToken });
}

export function verifyTwoFactor(mfaToken: string, code: string): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/2fa/verify', {
    method: 'POST',
    body: { mfaToken, code },
  });
}

export function setupTwoFactor(token: string): Promise<TwoFactorSetup> {
  return apiFetch<TwoFactorSetup>('/auth/2fa/setup', { method: 'POST', accessToken: token });
}

export function enableTwoFactor(token: string, code: string): Promise<TwoFactorEnableResult> {
  return apiFetch<TwoFactorEnableResult>('/auth/2fa/enable', {
    method: 'POST',
    body: { code },
    accessToken: token,
  });
}

export function getTwoFactorStatus(accessToken: string): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>('/auth/2fa/status', { accessToken });
}

export function disableTwoFactor(accessToken: string, code: string): Promise<void> {
  return apiFetch<void>('/auth/2fa/disable', {
    method: 'POST',
    body: { code },
    accessToken,
  });
}

/** Silent re-auth using docforum-core's httpOnly refresh cookie. The cookie
 * is cross-site, so `api-client`'s `credentials: 'include'` is required. */
export function refresh(): Promise<AuthSession> {
  return apiFetch<AuthSession>('/auth/refresh', { method: 'POST' });
}

// --- Invitation redemption (issue #81) -------------------------------------
// ASSUMED contract (docforum-core#39 admin invites, docforum-core#75
// facility staff invites — neither landed yet). See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Invitation redemption".

/**
 * Validate an invite token and fetch what it grants (organisation, role,
 * invited by). Deliberately unauthenticated: the invite link is the
 * credential. `404` = unknown token (also covers a used token the server
 * no longer returns); the invite's `status` field distinguishes
 * pending / accepted / revoked / expired for tokens the server still
 * recognises.
 */
export function getInvite(token: string): Promise<AccountInvite> {
  return apiFetch<AccountInvite>(`/auth/invites/${encodeURIComponent(token)}`);
}

export interface AcceptInviteInput {
  token: string;
  /** Pre-filled from the invite — the invited email cannot be changed. */
  email: string;
  /** New-account credentials. Omit when an existing user accepts after
   * logging in (authenticated accept, see `accessToken` below). */
  fullName?: string;
  password?: string;
}

/**
 * Redeem an invite. The role is NEVER sent: docforum-core derives it from
 * the token, so a tampered client cannot pick a role here (PRD OQ-2).
 * A brand-new user sends `fullName` + `password` and gets back a session
 * with the invited role. An existing user accepts after logging in by
 * sending just the token with their access token — `email` is still sent
 * so the server can check it matches the invite.
 */
export function acceptInvite(
  input: AcceptInviteInput,
  accessToken?: string | null,
): Promise<AuthSession> {
  const { token, ...body } = input;
  return apiFetch<AuthSession>(`/auth/invites/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    body,
    accessToken,
  });
}

// --- Active sessions and devices (issue #79) --------------------------------
// docforum-core: GET /auth/sessions, DELETE /auth/sessions/:id and
// DELETE /auth/sessions (every session except the current one).

/** Shape docforum-core returns for one refresh session. */
interface CoreSessionSummary {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  userAgent: string | null;
  ip?: string | null;
  current: boolean;
}

/** Coarse "OS · Browser" label. Deliberately coarse: no versions, no IP. */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device';
  const os =
    /iPhone/.test(userAgent) ? 'iPhone'
    : /iPad/.test(userAgent) ? 'iPad'
    : /Android/.test(userAgent) ? 'Android'
    : /Mac OS X|Macintosh/.test(userAgent) ? 'Mac'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Linux/.test(userAgent) ? 'Linux'
    : null;
  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : null;
  return [os, browser].filter(Boolean).join(' · ') || 'Unknown device';
}

export async function listSessions(accessToken: string): Promise<ActiveSession[]> {
  const sessions = await apiFetch<CoreSessionSummary[]>('/auth/sessions', { accessToken });
  // The API also returns the IP address; it is intentionally dropped here.
  return sessions.map((session) => ({
    id: session.id,
    device: describeDevice(session.userAgent),
    approximateLocation: null,
    lastActiveAt: session.lastUsedAt ?? session.createdAt,
    createdAt: session.createdAt,
    isCurrent: session.current,
  }));
}

export function revokeSession(sessionId: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function revokeOtherSessions(accessToken: string): Promise<RevokeOtherSessionsResult> {
  const result = await apiFetch<{ revoked: number }>('/auth/sessions', { method: 'DELETE', accessToken });
  return { revokedCount: result.revoked };
}

// Password reset (issue #387), implemented in docforum-core's auth module
// (routes/index.ts, controllers/index.ts, services/password-reset.ts).
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

// Email verification (issue #388). Contract source: docforum-core
// backend/src/modules/auth/routes/index.ts and controllers/index.ts.
export function verifyEmail(token: string): Promise<EmailVerificationResult> {
  return apiFetch<EmailVerificationResult>('/auth/verify-email', {
    method: 'POST',
    body: { token },
  });
}

export function resendVerificationEmail(accessToken: string): Promise<EmailVerificationResendResult> {
  return apiFetch<EmailVerificationResendResult>('/auth/verify-email/resend', {
    method: 'POST',
    accessToken,
  });
}
