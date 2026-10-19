// Auth calls to docforum-core. PROVISIONAL: these paths and payload shapes
// are the smallest reasonable assumption from ARCHITECTURE.md §2 (JWT
// access + refresh, role claims) — docforum-core's auth module has no
// implemented routes yet (its backend/src/modules/auth/* is a placeholder).
// Reconcile against the real contract once docforum-core's Phase 1 lands.
import { apiFetch } from './api-client';
import type { AccountInvite, SelfServeRole, User } from '../types/models';

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
