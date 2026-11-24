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
export type PaymentIntentStatus =
  | 'created'
  // docforum-core#80 (prepare) moves an intent here while it waits for the
  // patient's wallet signature; status value assumed until that issue lands.
  | 'awaiting_signature'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'failed';

// `PatientOrder` (= Prescription | LabOrder) is defined with the orders
// work (Phase W2, issue #5) — the order detail page (issue #61) reuses
// that shape as-is.

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
