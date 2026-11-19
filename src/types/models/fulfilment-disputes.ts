import type { Role } from './core';
import type { PayoutAsset } from './facility-payout-ledger';
import type { OrderTypeForPayment, PaymentIntentStatus } from './payments';

// --- Phase W6 — Fulfilment disputes (issue #76) -----------------------------
// Assumed contract: docforum-core#76 (facility fulfilment proof + patient
// receipt confirmation/dispute) has not landed. Endpoint paths and shapes are
// recorded in ARCHITECTURE_ESSENTIALS.md "Known assumptions"; reconcile here
// when that backend issue ships. A dispute is final once resolved: the held
// escrow is either released to the facility or refunded to the patient.

export type DisputeStatus = 'open' | 'resolved_facility' | 'resolved_patient';
export type DisputeResolution = 'facility' | 'patient';

/** Why the patient rejected the fulfilment. */
export type DisputeReason = 'not_received' | 'wrong_item' | 'incomplete' | 'damaged' | 'other';

export type DisputeAttachmentKind = 'dispensing_record' | 'specimen_id' | 'photo' | 'other';

export interface DisputeAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: DisputeAttachmentKind;
  uploadedAt: string;
  /** Display name or facility member id — never an email. */
  uploadedBy: string;
}

export interface DisputeFacilityProof {
  /** Dispensing record or specimen id the facility recorded. */
  reference: string;
  note: string | null;
  submittedAt: string;
  submittedBy: string;
  attachments: DisputeAttachment[];
}

export interface DisputePatientReport {
  reason: DisputeReason;
  description: string;
  submittedAt: string;
  /** Patient display name, never an email or profile id. */
  submittedBy: string;
}

export interface DisputePaymentSummary {
  intentId: string;
  status: PaymentIntentStatus;
  escrowId: string | null;
}

export type DisputeTimelineKind = 'opened' | 'proof_submitted' | 'patient_message' | 'payment' | 'resolved';

export interface DisputeTimelineEvent {
  id: string;
  at: string;
  actorRole: Role | 'system';
  actorName: string;
  kind: DisputeTimelineKind;
  summary: string;
}

/** Queue row — enough to triage without opening the detail. */
export interface FulfillmentDisputeSummary {
  id: string;
  status: DisputeStatus;
  orderId: string;
  orderType: OrderTypeForPayment;
  itemName: string;
  patientName: string;
  facility: { id: string; name: string };
  amountStroops: string;
  asset: PayoutAsset;
  reason: DisputeReason;
  openedAt: string;
  updatedAt: string;
}

export interface FulfillmentDispute extends FulfillmentDisputeSummary {
  patientReport: DisputePatientReport;
  facilityProof: DisputeFacilityProof | null;
  payment: DisputePaymentSummary;
  timeline: DisputeTimelineEvent[];
  resolvedAt: string | null;
  resolution: DisputeResolution | null;
  resolutionNotes: string | null;
  resolvedBy: string | null;
}

export interface ResolveDisputeInput {
  resolution: DisputeResolution;
  notes: string;
  /** The `updatedAt` the admin saw — a 409 means someone else resolved it. */
  expectedUpdatedAt: string;
}

/** One-time, short-lived URL for an attachment. Never rendered before the
 * admin asks for it, and never cached in the query client. */
export interface DisputeAttachmentUrl {
  url: string;
  expiresAt: string;
}
