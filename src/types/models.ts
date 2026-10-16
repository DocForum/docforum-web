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

// --- Appointments (docforum-core Phase 1 — real) -------------------------
// Mirrors `prisma.appointment.findMany({ include: { availabilitySlot: true } })`
// in docforum-core's appointments/repositories, which is exactly what its
// real `GET /appointments/mine` returns (a bare array, newest first).
// Dates are ISO strings here because that is what JSON carries.

export type SlotStatus = 'open' | 'held' | 'booked';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentOrigin = 'direct_booking' | 'referral';

export interface AvailabilitySlot {
  id: string;
  doctorProfileId: string;
  status: SlotStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientProfileId: string;
  doctorProfileId: string;
  availabilitySlotId: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  availabilitySlot: AvailabilitySlot;
  createdAt: string;
  updatedAt: string;
}

// --- Check-in + live queue position (assumed, docforum-core#129) ---------
// `AppointmentStatus` has no checked-in or being-seen value, so the visit's
// phase cannot come from the appointment row. It comes from this assumed
// queue projection instead. Reconcile when core#129 lands.

export type QueuePhase = 'not_open' | 'waiting' | 'being_seen' | 'completed';

export interface AppointmentQueue {
  appointmentId: string;
  phase: QueuePhase;
  /** Patients still ahead. null means no queue is published yet — which is
   * not the same as being first. */
  peopleAhead: number | null;
  /** Minutes. Always rendered as an estimate. */
  estimatedWaitMinutes: number | null;
  /** null = this backend has no check-in window, so the UI says "check in on
   * the day" instead of inventing an opening time. */
  checkInOpensAt: string | null;
  checkedInAt: string | null;
}

// --- 'Who viewed my records' access log (assumed, docforum-core#45) ------

export type AccessActorRole = 'doctor' | 'facility' | 'patient' | 'admin';
export type AccessRecordType = 'health_profile' | 'appointment' | 'referral' | 'order' | 'dependent';
export type AccessReason = 'consultation' | 'order_fulfillment' | 'result_delivery' | 'handover_claim' | 'support';

export interface AccessLogEvent {
  id: string;
  occurredAt: string;
  actorRole: AccessActorRole;
  actorName: string;
  recordType: AccessRecordType;
  reason: AccessReason;
}

export interface AccessLogPage {
  events: AccessLogEvent[];
  nextCursor: string | null;
}

// --- Payment history for patients (assumed, docforum-core#90) ------------
// `PaymentIntent` above is the real, mirrored shape and stays untouched; the
// patient-facing list is assumed to return it plus two display fields.
// Neither #34's nor #37's list exists in docforum-core yet, and it has no
// pagination helper to mirror, so both assume the same smallest envelope:
// send `?cursor=`, read `nextCursor` (null once exhausted).

export interface PaymentHistoryEntry extends PaymentIntent {
  /** assumed — the real row has no refund deadline column. */
  refundDeadlineAt?: string | null;
  /** assumed — the real response carries only `facilityId`, an internal id
   * the patient-facing UI must not render. */
  facilityName?: string;
}

export interface PaymentHistoryPage {
  intents: PaymentHistoryEntry[];
  nextCursor: string | null;
}
