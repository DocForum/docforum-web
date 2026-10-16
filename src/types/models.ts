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

// --- Orders (Phase W2 in docforum-web, assumed contract against
// docforum-core issue #71 / PRD §8.1.6 — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions". Endpoints and field names are provisional until
// docforum-core's order-token implementation lands.) -------------------

/** Type of clinical order a doctor can issue. */
export type OrderType = 'prescription' | 'lab_order';

/** Order validity state as reported by docforum-core.
 * - active:      Current, valid — show the scannable QR.
 * - superseded:  A newer order replaced this one — hide the QR, explain.
 * - expired:     Time-limited token has passed its validity window.
 * - fulfilled:   Facility marked the order completed.
 * - cancelled:   Order was cancelled by doctor or patient.
 */
export type OrderStatus = 'active' | 'superseded' | 'expired' | 'fulfilled' | 'cancelled';

/** An individual line item on a lab order or prescription. */
export interface OrderItem {
  /** Human-readable name (e.g. "FBC" or "Amoxicillin 250mg"). */
  name: string;
  /** Directions or instructions (optional). */
  note?: string;
}

/** Full detail of a patient order, as returned by docforum-core's
 * `GET /orders/:id` endpoint. The `token` field is the opaque signed
 * string that encodes into the QR code — never include order details
 * in the QR, only the token itself (issue #25 constraint). */
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  /** The signed, opaque token that facilities scan. Absent/null for
   * non-active orders (superseded, expired) — the QR must not be shown
   * when token is null. */
  token: string | null;
  items: OrderItem[];
  /** ISO 8601 timestamp of when the order was issued. */
  issuedAt: string;
  /** ISO 8601 expiry timestamp (null if the order has no time limit). */
  expiresAt: string | null;
  /** The doctor who issued the order. */
  doctorName: string; // assumed — not yet in schema.prisma
  /** The facility the patient chose (null if not yet assigned). */
  facilityName: string | null; // assumed — not yet in schema.prisma
  patientProfileId: string;
  createdAt: string;
  updatedAt: string;
}

// --- Dependents (Phase W2 — assumed, docforum-core#42 not landed yet) ------

export type Relationship = 'parent' | 'guardian' | 'carer';

export type HandoverStatus = 'not_eligible' | 'eligible' | 'invited' | 'claimed';

export interface Dependent {
  id: string;
  guardianProfileId: string;
  fullName: string;
  dateOfBirth: string;
  relationship: Relationship;
  handoverStatus: HandoverStatus;
  claimEmail?: string;
  claimInviteExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DependentInput {
  fullName: string;
  dateOfBirth: string;
  relationship: Relationship;
}

// --- Health profile (Phase W2 — assumed, docforum-core#59 not landed yet) ---

export type HealthSectionKey = 'allergies' | 'conditions' | 'medications';

export interface HealthEntry {
  id: string;
  patientProfileId: string;
  section: HealthSectionKey;
  name: string;
  details?: string;
  version: number;
  previousValue?: string;
  updatedAt: string;
  createdAt: string;
}

export interface HealthEntryInput {
  section: HealthSectionKey;
  name: string;
  details?: string;
}

// --- Acting-for profile (Phase W2 — client-only UI state + API scoping) ----

export interface ActingProfile {
  id: string;
  fullName: string;
  isSelf: boolean;
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
