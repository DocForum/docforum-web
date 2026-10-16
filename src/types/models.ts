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

// --- Lab results (Phase W2 patient results viewer, issue #24) ----------------
// LabOrder's own columns (testType/urgency/status) already exist in
// docforum-core's schema.prisma (Phase 0 placeholder) — mirrored here as
// real, not assumed. Everything marked "assumed" below does NOT exist
// there yet: it is the smallest reasonable guess at what docforum-core
// issue #72 (abnormal escalation + acknowledgement tracking, PRD §8.2.7)
// will ship, needed to build this viewer now. Reconcile on sight once
// that backend issue merges — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions (assumed API contracts)".

export type OrderStatus = 'issued' | 'fulfilled' | 'expired' | 'superseded';
export type Urgency = 'routine' | 'urgent';

export interface LabOrder {
  id: string;
  testType: string;
  urgency: Urgency;
  status: OrderStatus;
  createdAt: string;
}

/** Set by the facility when attaching a result (docforum-core #72). */
export type AbnormalityFlag = 'normal' | 'abnormal' | 'critical';

/** Whether a result file is attached yet. Assumed. */
export type LabResultStatus = 'pending' | 'ready';

/**
 * Doctor-acknowledgement state for abnormal/critical results
 * (docforum-core #72). Assumed:
 * - `not_required` — normal results never create a task.
 * - `pending` — doctor notified, not yet acknowledged.
 * - `acknowledged` — doctor reviewed.
 * - `escalated` — critical result past N hours without acknowledgement,
 *   moved to the admin queue.
 */
export type AcknowledgementStatus = 'not_required' | 'pending' | 'acknowledged' | 'escalated';

export interface LabResult {
  id: string;
  /** FK to the lab order this result belongs to. Assumed (TODO in schema). */
  labOrderId: string;
  /** Denormalized test name from LabOrder.testType, for list display. Assumed. */
  testName: string;
  /** Fulfilling facility id. Assumed (TODO in schema). */
  facilityId: string;
  /** Denormalized facility name, for list display. Assumed. */
  facilityName: string;
  /** Assumed — schema has no status column on LabResult yet. */
  status: LabResultStatus;
  /** Assumed — the core of docforum-core #72. */
  abnormalityFlag: AbnormalityFlag;
  /** Assumed — mirrors #72's acknowledgement task state. */
  acknowledgementStatus: AcknowledgementStatus;
  /** When an abnormal/critical result notified the ordering doctor. Assumed. */
  doctorNotifiedAt: string | null;
  /** When the ordering doctor acknowledged the result. Assumed. */
  acknowledgedAt: string | null;
  /**
   * True when the backend holds a result until a doctor reviews it first
   * (#72 leaves this open: "decide whether critical results are held").
   * When true the patient sees a "waiting for doctor review" notice
   * instead of the summary/file. Assumed.
   */
  withheldPendingReview: boolean;
  // Below: real columns, already in schema.prisma.
  summary: string | null;
  resultFileUrl: string | null;
  createdAt: string;
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
