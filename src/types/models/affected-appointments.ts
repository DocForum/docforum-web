import type { Role } from './core';
import type { AppointmentStatus } from './doctor-core-flow';
import type { FeatureFlagKind } from './feature-flags-console';

// --- Affected appointments preview ---------------------------------------

export interface AffectedAppointment {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string | null;
}

export interface FeatureFlagTargeting {
  /** Empty means every role is eligible. */
  roles: Role[];
  /** On for these users while the flag is enabled, whatever the roles or
   * rollout percentage say. */
  userIds: string[];
}

export interface FeatureFlag {
  id: string;
  /** Stable identifier the backend evaluates, e.g. `wallet_payments`. */
  key: string;
  description: string | null;
  kind: FeatureFlagKind;
  /** The kill switch: off means off for everyone, allowlist included. */
  enabled: boolean;
  /** Whole number 0–100 for `percentage` flags (sticky per user, hash-based),
   * null for `boolean` ones. */
  rolloutPercentage: number | null;
  targeting: FeatureFlagTargeting;
  createdAt: string;
  updatedAt: string;
}
