import type { PaymentIntentStatus } from './payments';

// --- Phase W5 — Pay with wallet (issue #59) ---------------------------------
// `POST /payments/intents/:id/prepare` and `POST /payments/intents/:id/submit`
// are assumed: docforum-core#80 and #81 describe both endpoints but have not
// landed. Everything else here (`PaymentIntent`, stroops as strings) is real.
// This repo never builds, simulates or submits a transaction — it hands the
// prepared XDR to the patient's wallet and returns the signed XDR (hard rule 1).

/** Unsigned transaction docforum-core built and simulated for this intent. */
export interface PreparedTransaction {
  intentId: string;
  /** The unsigned XDR — the only thing the patient's wallet ever sees. */
  xdr: string;
  /** ISO time after which the prepared transaction is no longer accepted.
   * Expiry is a normal outcome (ADR 0005), not an error. */
  expiresAt: string;
  /** Ledger sequence the transaction is valid until, when the backend knows it. */
  expiryLedger: number | null;
  status: PaymentIntentStatus;
}
