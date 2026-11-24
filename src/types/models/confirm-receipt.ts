import type { DisputeReason, DisputeStatus } from './fulfilment-disputes';
import type { OrderStatus } from './orders';

// --- Phase W2 — Patient confirm receipt / report problem (issue #35) ---------
// Assumed contract: patient-side dispute initiation endpoints not yet in
// docforum-core. The patient can confirm receipt of a fulfilled order or
// report a problem within a time window. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions".

/** The confirmation window for a fulfilled order — the patient must confirm
 * or dispute within this time. */
export interface OrderConfirmationWindow {
  /** ISO timestamp when the window closes. */
  deadlineAt: string;
  /** What happens if the patient takes no action. */
  inactionConsequence: 'auto_confirm' | 'escrow_held' | 'refund_pending';
}

/** Patient confirms they received the order correctly. */
export interface ConfirmReceiptInput {
  /** The order the patient is confirming. */
  orderId: string;
  /** The `updatedAt` the patient saw — a 409 means someone else acted. */
  expectedUpdatedAt: string;
}

/** Patient reports a problem with the order fulfillment. */
export interface ReportProblemInput {
  /** The order the patient is disputing. */
  orderId: string;
  /** Why the patient is reporting a problem. */
  reason: DisputeReason;
  /** Additional details about the problem. */
  description: string;
  /** The `updatedAt` the patient saw — a 409 means someone else acted. */
  expectedUpdatedAt: string;
}

/** Response from confirming receipt — the updated order. */
export interface ConfirmReceiptResponse {
  orderId: string;
  status: OrderStatus;
  confirmedAt: string;
  updatedAt: string;
}

/** Response from reporting a problem — the created dispute. */
export interface ReportProblemResponse {
  disputeId: string;
  orderId: string;
  status: DisputeStatus;
  submittedAt: string;
  updatedAt: string;
}
