// Frontend-side TypeScript types mirroring backend/prisma/schema.prisma in
// docforum-core. Keep in sync — see AGENTS.md doc-update table and hard
// rule 2 in ARCHITECTURE_ESSENTIALS.md ("don't invent parallel
// frontend-only shapes for the same entities").
//
// docforum-core's schema is still field-sparse (Phase 1 not started there
// — see its ROADMAP.md). Fields below marked "assumed" don't exist in
// schema.prisma yet; they're the smallest reasonable guess needed to build
// a signup form, not a confirmed contract. Reconcile this file once
// docforum-core actually defines them.

export type Role = 'patient' | 'doctor' | 'facility' | 'admin';

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

// --- Payments (Phase 5.5 in docforum-core — real, not assumed. See that
// repo's docs/adr/0004-custodial-payments-v1.md) ---------------------------
// Custodial v1: docforum-core holds its own Stellar identities; this repo
// never calls Stellar/docforum-escrow directly (hard rule 1 above).
// WalletLink is scoped to the facility (the on-chain payee), not a patient.

export interface WalletLink {
  id: string;
  facilityId: string;
  stellarPublicKey: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderTypeForPayment = 'prescription' | 'lab_order';
export type PaymentIntentStatus = 'created' | 'escrowed' | 'released' | 'refunded' | 'failed';

export interface PaymentIntent {
  id: string;
  orderType: OrderTypeForPayment;
  // Opaque — Prescription/LabOrder don't exist as real records in
  // docforum-core yet (Phase 4). Not validated against anything there.
  orderId: string;
  status: PaymentIntentStatus;
  patientProfileId: string;
  facilityId: string;
  // Raw stroops (native XLM's smallest unit), sent/received as a string
  // over JSON — matches docforum-core's BigInt field exactly, no
  // decimal/currency conversion.
  amountStroops: string;
  escrowId: string | null;
  stellarTxHash: string | null;
  sorobanContractId: string | null;
  createdAt: string;
  updatedAt: string;
}
