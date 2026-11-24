// --- Phase W4 — Facility Staff Accounts & Fulfillment Attribution (issue #51, docforum-core#75) ---

export type FacilityMemberRole = 'owner' | 'staff';

export interface FacilityMember {
  id: string;
  facilityId: string;
  userId: string;
  fullName: string;
  email: string;
  role: FacilityMemberRole;
  joinedAt: string;
  isCurrentUser?: boolean;
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface FacilityInvite {
  id: string;
  facilityId: string;
  email: string;
  role: FacilityMemberRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: InviteStatus;
}

export interface InviteMemberInput {
  email: string;
  role: FacilityMemberRole;
}

export interface RemoveMemberResponse {
  success: boolean;
  memberId: string;
  sessionsRevoked: boolean;
  message: string;
}

export type FulfillmentOrderType = 'prescription' | 'lab';
export type FulfillmentItemStatus =
  | 'pending'
  | 'in_progress'
  | 'partially_dispensed'
  | 'fulfilled'
  | 'dispensed_elsewhere'
  | 'rejected';

export interface FulfillmentActionAttribution {
  action: 'dispensed' | 'sample_collected' | 'verified' | 'rejected';
  performedByUserId: string;
  performedByName: string;
  performedByEmail: string;
  performedByRole: FacilityMemberRole;
  timestamp: string;
  notes?: string | null;
}

export interface FulfillmentLabResult {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByUserId: string;
  storageKey?: string | null;
  downloadUrl?: string | null;
}

export interface FulfillmentQueueItem {
  id: string;
  facilityId: string;
  orderId: string;
  orderType: FulfillmentOrderType;
  /** The owning fulfilment record for the real PATCH endpoints (issue #269).
   * The queue listing is still an assumed contract; when it omits these,
   * callers fall back to `id` (and the mock treats it as both ids). */
  fulfillmentRecordId?: string;
  /** The FulfillmentItem id inside that record, for item-level dispensing. */
  fulfillmentItemId?: string;
  patientName: string;
  patientProfileId: string;
  itemName: string;
  instructions?: string | null;
  /** Links this facility queue row to the patient's order item. */
  orderItemId?: string;
  status: FulfillmentItemStatus;
  receivedAt: string;
  attribution?: FulfillmentActionAttribution | null;
  labResult?: FulfillmentLabResult | null;
  // --- Partial fulfilment (issue #54, docforum-core#73 assumed) -----------
  quantityPrescribed?: number;
  quantityDispensed?: number;
  quantityOutstanding?: number;
  unit?: string;
  canDispense?: boolean;
  blockedReason?: string | null;
  dispensedByFacilityId?: string | null;
  dispensedByFacilityName?: string | null;
}

// --- Issue #269 — real pharmacy-order fulfilment records -------------------
// `PATCH /pharmacy-orders/fulfillments/:id` takes `in_progress | rejected`;
// `PATCH /pharmacy-orders/fulfillments/:id/items/:itemId` takes
// `dispensed | unfulfilled`. `fulfilled` is derived by docforum-core and is
// never settable from this client.

export type PharmacyFulfillmentRecordStatus =
  | 'pending'
  | 'in_progress'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'rejected';

export type PharmacyFulfillmentItemStatus = 'pending' | 'dispensed' | 'unfulfilled';

export interface PharmacyFulfillmentRecordItem {
  id: string;
  recordId: string;
  orderItemId: string;
  status: PharmacyFulfillmentItemStatus;
  quantityOrdered: number | null;
  quantityDispensed: number | null;
  dispensedAt: string | null;
}

export interface PharmacyFulfillmentRecord {
  id: string;
  prescriptionId: string | null;
  labOrderId: string | null;
  facilityId: string;
  status: PharmacyFulfillmentRecordStatus;
  items: PharmacyFulfillmentRecordItem[];
  createdAt: string;
  updatedAt: string;
}

/** The item PATCH returns the updated record plus the derived order state. */
export interface FulfillmentItemUpdateResult {
  record: PharmacyFulfillmentRecord;
  orderStatus: 'issued' | 'partially_fulfilled' | 'fulfilled';
}
