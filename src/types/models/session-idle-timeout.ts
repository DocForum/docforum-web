import type { Role } from './core';

// --- Session idle timeout (issue #82) — ASSUMED, not yet in docforum-core --
// Shared clinical devices: the backend is expected to be able to push its
// own per-role idle timeout, which takes precedence over the frontend
// defaults. See ARCHITECTURE_ESSENTIALS.md "Known assumptions — Session
// idle timeout".

export interface SessionTimeoutSettings {
  /** Idle minutes before the session is signed out. */
  idleTimeoutMinutes: number;
  /** Seconds of warning shown before the sign-out. */
  warningSeconds: number;
}

/** Roles a user may self-register as. Facility accounts are admin-invited
 * only (PRD OQ-2) — there is deliberately no self-serve facility signup. */
export type SelfServeRole = Extract<Role, 'patient' | 'doctor'>;

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string; // assumed — not yet in schema.prisma
  dateOfBirth?: string; // assumed — not yet in schema.prisma
}

export interface DoctorProfile {
  id: string;
  userId: string;
  fullName: string; // assumed — not yet in schema.prisma
  verificationStatus: VerificationStatus;
}

export type FacilityType = 'lab' | 'pharmacy';

export interface FacilityProfile {
  id: string;
  userId: string;
  name: string; // assumed — not yet in schema.prisma
  type: FacilityType;
}
