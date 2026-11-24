import type { PaymentIntent } from './payments';

// --- Payment history and receipts (#37) --------------------------------------

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
