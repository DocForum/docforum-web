// --- Phase W5 — Facility payout ledger, mapped from docforum-core's real
// `GET /payments/facility/ledger` (scoped to the caller's facility).
//
// `amount`, `escrowed`, `released` and `refunded` are BigInt stroop values
// serialized as strings — they must never round-trip through a JS number.

export type PayoutAsset = 'XLM' | 'USDC';

/** A configured payment asset. `code` is whatever docforum-core supports. */
export interface FacilityLedgerAsset {
  type: 'native' | 'issued';
  code: string;
}

export type FacilityLedgerStatus =
  | 'created'
  | 'funding'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'failed';

export interface FacilityLedgerItem {
  id: string;
  orderType: 'prescription' | 'lab_order';
  orderId: string;
  status: FacilityLedgerStatus;
  /** Smallest unit of `assetCode`, as a string. */
  amount: string;
  assetCode: string;
  asset: FacilityLedgerAsset;
  escrowId: string | null;
  stellarTxHash: string | null;
  sorobanContractId: string | null;
  refundAfter: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Server-side lifecycle totals for one asset, over the filtered range. */
export interface FacilityLedgerTotals {
  asset: FacilityLedgerAsset;
  escrowed: string;
  released: string;
  refunded: string;
}

export interface FacilityLedgerPage {
  items: FacilityLedgerItem[];
  nextCursor: string | null;
  totals: FacilityLedgerTotals[];
}
