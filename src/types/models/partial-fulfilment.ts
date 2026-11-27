// --- Phase W4 — Partial fulfilment (issue #54, depends on
// docforum-core#73) ---------------------------------------------------------
// Assumed contract: order-level status is derived from item-level rows.
// The exact payment-release rule is backend-owned and pending #73; the UI
// renders `payment.rule` rather than computing/guessing a release amount.

export type PartialFulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'rejected';

export type OrderItemFulfillmentStatus =
  | 'pending'
  | 'partially_dispensed'
  | 'dispensed'
  | 'dispensed_elsewhere'
  | 'rejected';

/** Item-level fulfilment row for a patient order (issue #54). Named
 * `OrderItemFulfillment` rather than `OrderItem` so it doesn't collide with
 * `OrderItem` above, which is the plain line item on main's `Order`. */
export interface OrderItemFulfillment {
  id: string;
  orderId: string;
  name: string;
  instructions?: string | null;
  quantityPrescribed: number;
  quantityDispensed: number;
  quantityOutstanding: number;
  unit: string;
  status: OrderItemFulfillmentStatus;
  dispensedByFacilityId?: string | null;
  dispensedByFacilityName?: string | null;
  dispensedAt?: string | null;
  routedToFacilityId?: string | null;
  routedToFacilityName?: string | null;
  /** Backend-derived: false once another facility dispensed or the
   * remaining quantity was routed elsewhere. */
  canDispense: boolean;
  blockedReason?: string | null;
}

export interface OrderPaymentSummary {
  status: 'held' | 'partially_released' | 'released' | 'refunded' | 'none';
  heldStroops: string;
  releasedStroops: string;
  refundedStroops: string;
  /** Plain-language rule supplied by docforum-core, shown verbatim. */
  rule: string;
}

export interface DispenseFulfillmentItemInput {
  quantity: number;
}

export interface RouteRemainingItemsInput {
  facilityId: string;
  itemIds: string[];
}

/** Record-level statuses only: `fulfilled` is derived from dispensed items
 * by docforum-core and cannot be set from this client. */
export type FulfillmentStatusUpdate = 'in_progress' | 'rejected';

/** Compact progress for one order version (#262), from
 * `GET /pharmacy-orders/orders/:orderId/fulfillment-status?orderType=`.
 * Core derives it from the order's item rows; the UI never recomputes it. */
export type OrderFulfillmentProgressStatus = 'issued' | 'partially_fulfilled' | 'fulfilled';

export interface OrderFulfillmentProgress {
  totalItems: number;
  dispensedItems: number;
  status: OrderFulfillmentProgressStatus;
}
