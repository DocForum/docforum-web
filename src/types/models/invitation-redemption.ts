import type { FeatureFlagTargeting } from './affected-appointments';
import type { Role } from './core';

// --- Invitation redemption — admins & facility staff (issue #81, PRD OQ-2) ---
// Admins and facility staff never self-register; they join through an
// invite link. These shapes are ASSUMED: they depend on docforum-core#39
// (admin invites) and docforum-core#75 (facility staff invites), neither
// of which has landed. See ARCHITECTURE_ESSENTIALS.md "Known assumptions".

/** Roles an invite may grant. Never patient/doctor — those self-serve. */
export type InviteRole = Extract<Role, 'facility' | 'admin'>;

export type AccountInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface AccountInvite {
  id: string;
  email: string;
  /** The role the account gets — server-side, from the invite. It is never
   * a form field; the client cannot choose or change it. */
  role: InviteRole;
  organisationName: string;
  organisationType: string | null;
  /** Full name of the person who sent the invite, if the server exposes it. */
  invitedBy: string | null;
  status: AccountInviteStatus;
  invitedAt: string;
  expiresAt: string;
}

/** Only the fields being changed are sent. */
export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  rolloutPercentage?: number;
  targeting?: FeatureFlagTargeting;
  /** The `updatedAt` the admin saw — lets docforum-core answer `409` if
   * someone else changed the flag in the meantime. */
  expectedUpdatedAt: string;
}
