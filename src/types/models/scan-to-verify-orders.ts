import type { FulfillmentOrderType } from './facility-staff';

// --- Phase W4 — Scan-to-verify orders (issue #52, docforum-core#71) ---

export type OrderVerificationStatus =
  | 'valid'
  | 'superseded'
  | 'expired'
  | 'fulfilled'
  | 'not_eligible';

export interface VerifiedOrderSummary {
  orderId: string;
  orderType: FulfillmentOrderType;
  patientName: string;
  medicationOrTest: string;
  instructions?: string | null;
  issuedAt: string;
  expiresAt: string;
  supersededBy?: string | null;
  fulfilledAt?: string | null;
  fulfilledByFacility?: string | null;
}

export interface VerifyOrderResponse {
  status: OrderVerificationStatus;
  token: string;
  verifiedAt: string;
  message?: string;
  order?: VerifiedOrderSummary | null;
}
