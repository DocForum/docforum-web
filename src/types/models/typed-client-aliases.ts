import type { OrderTypeForPayment } from './payments';

// --- Types moved to the generated schema in the typed-client branch --------
// Upstream declares these in the services that use them; the typed client
// branch re-exports the generated shapes from here. Keep the local aliases so
// both sets of imports resolve.
export type HealthEntryUpdate = {
  name?: string;
  details?: string | null;
};

export interface CreatePaymentIntentInput {
  orderType: OrderTypeForPayment;
  orderId: string;
  patientProfileId: string;
  facilityId: string;
  amountStroops: string;
}
