import type { OrderConfirmationWindow } from './confirm-receipt';
import type { OrderItemFulfillment, OrderPaymentSummary, PartialFulfillmentStatus } from './partial-fulfilment';
import type { FacilityType } from './session-idle-timeout';

// --- Patient orders and facility selection (Phase W2, issue #5) -------------

export type OrderLifecycleStatus = 'active' | 'completed' | 'cancelled' | 'superseded';

export interface OrderFacilitySummary {
  id: string;
  name: string;
  type: FacilityType;
  isOpen?: boolean;
}

export interface OrderVersionBase {
  id: string;
  patientProfileId: string;
  version: number;
  supersedesId: string | null;
  status: OrderLifecycleStatus;
  issuedAt: string;
  issuedByDoctorName?: string | null;
  requiresFacilitySelection: boolean;
  selectedFacility?: OrderFacilitySummary | null;
  /** Catalog code of the ordered medication/test, used to compare facility
   * prices for this item (issue #258, assumed field). */
  catalogItemCode?: string | null;
  // --- Partial fulfilment (issue #54, docforum-core#73 assumed) -----------
  // Optional so main's W2 order screens keep compiling; the partial-fulfilment
  // screens in `features/orders` read these.
  patientName?: string;
  medicationOrTest?: string;
  expiresAt?: string;
  facilityId?: string | null;
  facilityName?: string | null;
  fulfillmentStatus?: PartialFulfillmentStatus;
  items?: OrderItemFulfillment[];
  payment?: OrderPaymentSummary;
  /** Confirmation window for fulfilled orders (issue #35). */
  confirmationWindow?: OrderConfirmationWindow | null;
}

export interface Prescription extends OrderVersionBase {
  orderType: 'prescription';
  medication: string;
  dose: string;
  quantity?: string | null;
  instructions?: string | null;
}
