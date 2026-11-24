// Facility team management and fulfillment queue endpoints.
//
// The queue listing is still an assumed contract. Writes go through the real
// docforum-core routes (issue #269):
//   PATCH /pharmacy-orders/fulfillments/:id            { status }
//   PATCH /pharmacy-orders/fulfillments/:id/items/:itemId
//                                                       { status, quantityDispensed? }
import { http } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import { FACILITY_USER } from '../fixtures';
import type {
  FacilityInvite,
  FulfillmentActionAttribution,
  FulfillmentQueueItem,
  FulfillmentStatusUpdate,
  PatientOrder,
  PharmacyFulfillmentItemStatus,
  PharmacyFulfillmentRecord,
  PharmacyFulfillmentRecordStatus,
} from '../../types/models';

function recordIdOf(item: FulfillmentQueueItem): string {
  return item.fulfillmentRecordId ?? item.id;
}

function itemIdOf(item: FulfillmentQueueItem): string {
  return item.fulfillmentItemId ?? item.id;
}

function recordItems(recordId: string): FulfillmentQueueItem[] {
  return db.fulfillmentQueue.filter((item) => recordIdOf(item) === recordId);
}

function deriveOrderStatus(order: PatientOrder): PatientOrder['fulfillmentStatus'] {
  const items = order.items ?? [];
  if (items.every((item) => item.status === 'rejected')) return 'rejected';
  if (items.every((item) => item.quantityOutstanding <= 0)) return 'fulfilled';
  if (items.some((item) => item.quantityDispensed > 0)) return 'partially_fulfilled';
  return 'unfulfilled';
}

function recordItemStatus(item: FulfillmentQueueItem): PharmacyFulfillmentItemStatus {
  if (item.status === 'fulfilled') return 'dispensed';
  if (item.status === 'rejected' || item.status === 'dispensed_elsewhere') return 'unfulfilled';
  return 'pending';
}

function deriveRecordStatus(items: FulfillmentQueueItem[]): PharmacyFulfillmentRecordStatus {
  if (items.every((item) => item.status === 'fulfilled')) return 'fulfilled';
  if (items.every((item) => item.status === 'rejected' || item.status === 'dispensed_elsewhere')) {
    return 'rejected';
  }
  if (items.some((item) => (item.quantityDispensed ?? 0) > 0)) return 'partially_fulfilled';
  if (
    items.some(
      (item) =>
        item.status === 'in_progress' ||
        item.status === 'partially_dispensed',
    )
  ) {
    return 'in_progress';
  }
  return 'pending';
}

function buildRecord(recordId: string): PharmacyFulfillmentRecord | null {
  const rows = recordItems(recordId);
  if (rows.length === 0) return null;
  const first = rows[0];
  const timestamps = rows
    .map((item) => item.receivedAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    id: recordId,
    prescriptionId: first.orderType === 'prescription' ? first.orderId : null,
    labOrderId: first.orderType === 'lab' ? first.orderId : null,
    facilityId: first.facilityId,
    status: deriveRecordStatus(rows),
    items: rows.map((item) => ({
      id: itemIdOf(item),
      recordId,
      orderItemId: item.orderItemId ?? item.id,
      status: recordItemStatus(item),
      quantityOrdered: item.quantityPrescribed ?? null,
      quantityDispensed: item.quantityDispensed ?? null,
      dispensedAt:
        item.status === 'fulfilled' || item.status === 'partially_dispensed'
          ? (item.attribution?.timestamp ?? null)
          : null,
    })),
    createdAt: timestamps[0],
    updatedAt: new Date().toISOString(),
  };
}

function orderStatusFor(recordId: string): 'issued' | 'partially_fulfilled' | 'fulfilled' {
  const rows = recordItems(recordId);
  const order = db.orders.find((candidate) => candidate.id === rows[0]?.orderId);
  if (!order) return 'issued';
  const items = order.items ?? [];
  if (items.length > 0 && items.every((item) => item.quantityOutstanding <= 0)) {
    return 'fulfilled';
  }
  if (items.some((item) => item.quantityDispensed > 0)) return 'partially_fulfilled';
  return 'issued';
}

function attribution(
  action: FulfillmentActionAttribution['action'],
  notes: string | null = null,
): FulfillmentActionAttribution {
  return {
    action,
    performedByUserId: FACILITY_USER.id,
    performedByName: 'Frank Facility (fake)',
    performedByEmail: FACILITY_USER.email,
    performedByRole: 'owner',
    timestamp: new Date().toISOString(),
    notes,
  };
}

function syncOrderItem(
  item: FulfillmentQueueItem,
  facilityName: string,
  quantity: number,
  now: string,
) {
  if (!item.orderItemId) return;
  const order = db.orders.find((o) => o.id === item.orderId);
  if (!order) return;
  const orderItem = (order.items ?? []).find((i) => i.id === item.orderItemId);
  if (!orderItem) return;

  orderItem.quantityDispensed = Math.min(
    orderItem.quantityPrescribed,
    orderItem.quantityDispensed + quantity,
  );
  orderItem.quantityOutstanding = Math.max(
    0,
    orderItem.quantityPrescribed - orderItem.quantityDispensed,
  );
  orderItem.status = orderItem.quantityOutstanding === 0 ? 'dispensed' : 'partially_dispensed';
  orderItem.dispensedByFacilityId = item.facilityId;
  orderItem.dispensedByFacilityName = facilityName;
  orderItem.dispensedAt = now;
  orderItem.canDispense = orderItem.quantityOutstanding > 0;
  orderItem.blockedReason = null;

  for (const other of db.fulfillmentQueue) {
    if (other.id === item.id || other.orderItemId !== item.orderItemId) continue;
    if (orderItem.quantityOutstanding === 0) {
      other.status = 'dispensed_elsewhere';
      other.quantityDispensed = orderItem.quantityDispensed;
      other.quantityOutstanding = 0;
      other.canDispense = false;
      other.dispensedByFacilityId = item.facilityId;
      other.dispensedByFacilityName = facilityName;
      other.blockedReason = `Dispensed by ${facilityName}.`;
    }
  }

  order.fulfillmentStatus = deriveOrderStatus(order);
}

function rejectOrderItem(item: FulfillmentQueueItem) {
  if (!item.orderItemId) return;
  const order = db.orders.find((o) => o.id === item.orderId);
  const orderItem = (order?.items ?? []).find((i) => i.id === item.orderItemId);
  if (!order || !orderItem || orderItem.quantityDispensed > 0) return;
  orderItem.status = 'rejected';
  orderItem.canDispense = false;
  orderItem.blockedReason = 'Rejected by facility.';
  order.fulfillmentStatus = deriveOrderStatus(order);
}

export const facilityTeamHandlers = [
  http.get('*/facilities/:facilityId/members', respond('list', () => db.facilityMembers)),

  http.get('*/facilities/:facilityId/invites', respond('list', () => db.facilityInvites)),

  http.post(
    '*/facilities/:facilityId/invites',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        role?: FacilityInvite['role'];
      };
      const invite: FacilityInvite = {
        id: `inv-mock-${Date.now()}`,
        facilityId,
        email: body.email ?? 'mystery@example.test',
        role: body.role ?? 'staff',
        invitedBy: FACILITY_USER.id,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      };
      db.facilityInvites.push(invite);
      return invite;
    }),
  ),

  http.post(
    '*/facilities/:facilityId/invites/:inviteId/resend',
    respond('json', ({ params }) => {
      const invite = db.facilityInvites.find((i) => i.id === paramId(params, 'inviteId'));
      if (!invite) return notFound('invite');
      invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      return invite;
    }),
  ),

  http.delete(
    '*/facilities/:facilityId/invites/:inviteId',
    respond('json', ({ params }) => {
      const inviteId = paramId(params, 'inviteId');
      db.facilityInvites = db.facilityInvites.filter((i) => i.id !== inviteId);
      return { success: true };
    }),
  ),

  http.delete(
    '*/facilities/:facilityId/members/:memberId',
    respond('json', ({ params }) => {
      const memberId = paramId(params, 'memberId');
      const member = db.facilityMembers.find((m) => m.id === memberId);
      if (!member) return notFound('member');
      const owners = db.facilityMembers.filter((m) => m.role === 'owner');
      if (member.role === 'owner' && owners.length <= 1) {
        return conflict('cannot remove the last owner of a facility');
      }
      db.facilityMembers = db.facilityMembers.filter((m) => m.id !== memberId);
      return {
        success: true,
        memberId,
        sessionsRevoked: true,
        message: 'Mock API: member removed and their sessions revoked (fixture only).',
      };
    }),
  ),

  http.get(
    '*/facilities/:facilityId/fulfillment-queue',
    respond('list', ({ params }) => {
      const facilityId = paramId(params, 'facilityId');
      return db.fulfillmentQueue.filter((item) => item.facilityId === facilityId);
    }),
  ),

  // Record-level status. `fulfilled` is derived, never accepted.
  http.patch(
    '*/pharmacy-orders/fulfillments/:id',
    respond('json', async ({ params, request }) => {
      const recordId = paramId(params, 'id');
      const rows = recordItems(recordId);
      if (rows.length === 0) return notFound('fulfillment record');

      const body = (await request.json().catch(() => ({}))) as {
        status?: FulfillmentStatusUpdate;
      };
      const status = body.status;
      if (status !== 'in_progress' && status !== 'rejected') {
        return badRequest('status must be in_progress or rejected');
      }
      if (
        rows.some((item) =>
          ['fulfilled', 'rejected', 'dispensed_elsewhere'].includes(item.status),
        )
      ) {
        return conflict('this fulfillment record is already closed');
      }
      if (status === 'rejected' && rows.some((item) => (item.quantityDispensed ?? 0) > 0)) {
        return conflict('cannot reject a fulfillment record after an item was dispensed');
      }

      db.fulfillmentQueue = db.fulfillmentQueue.map((item) => {
        if (!rows.some((row) => row.id === item.id)) return item;
        if (status === 'rejected') {
          return {
            ...item,
            status: 'rejected',
            canDispense: false,
            blockedReason: 'Rejected by facility.',
            attribution: attribution('rejected'),
          };
        }
        return {
          ...item,
          status: 'in_progress',
          attribution: attribution('verified'),
        };
      });

      return buildRecord(recordId);
    }),
  ),

  // Item-level dispensing, one-shot per item.
  http.patch(
    '*/pharmacy-orders/fulfillments/:id/items/:itemId',
    respond('json', async ({ params, request }) => {
      const recordId = paramId(params, 'id');
      const rows = recordItems(recordId);
      const item = rows.find((row) => itemIdOf(row) === paramId(params, 'itemId'));
      if (!item) return notFound('fulfillment item');

      // Anything but pending has already had its one PATCH (or is closed
      // elsewhere). A replay must be a 409, never a second dispense.
      if (item.status !== 'pending' && item.status !== 'in_progress') {
        return conflict('this item was already dispensed, rejected, or closed elsewhere');
      }

      const body = (await request.json().catch(() => ({}))) as {
        status?: 'dispensed' | 'unfulfilled';
        quantityDispensed?: number;
      };
      if (body.status !== 'dispensed' && body.status !== 'unfulfilled') {
        return badRequest('status must be dispensed or unfulfilled');
      }

      const facility = db.facilities.find((f) => f.id === item.facilityId);
      const facilityName = facility?.name ?? 'Mock facility (fake)';
      const prescribed = item.quantityPrescribed ?? 1;
      const dispensed = item.quantityDispensed ?? 0;
      const outstanding =
        item.quantityOutstanding ?? Math.max(0, prescribed - dispensed);

      if (body.status === 'unfulfilled') {
        item.status = 'rejected';
        item.canDispense = false;
        item.blockedReason = 'Rejected by facility.';
        item.attribution = attribution('rejected');
        rejectOrderItem(item);
        return {
          record: buildRecord(recordId),
          orderStatus: orderStatusFor(recordId),
        };
      }

      const quantity = body.quantityDispensed ?? outstanding;
      if (!Number.isInteger(quantity) || quantity < 1) {
        return badRequest('quantityDispensed must be a positive integer');
      }
      if (quantity > outstanding) {
        return badRequest(`quantityDispensed exceeds the outstanding amount (${outstanding})`);
      }

      const now = new Date().toISOString();
      const newOutstanding = outstanding - quantity;
      item.quantityPrescribed = prescribed;
      item.quantityDispensed = dispensed + quantity;
      item.quantityOutstanding = newOutstanding;
      item.status = newOutstanding === 0 ? 'fulfilled' : 'partially_dispensed';
      // One-shot: the record item is terminal after this PATCH regardless of
      // whether the full quantity was supplied.
      item.canDispense = false;
      item.blockedReason =
        newOutstanding > 0
          ? 'Partially dispensed; the remainder must be rerouted from the order.'
          : null;
      item.dispensedByFacilityId = item.facilityId;
      item.dispensedByFacilityName = facilityName;
      item.attribution = attribution(
        item.orderType === 'prescription' ? 'dispensed' : 'sample_collected',
        `Mock API: dispensed ${quantity} of ${prescribed} (fixture only).`,
      );

      syncOrderItem(item, facilityName, quantity, now);
      return {
        record: buildRecord(recordId),
        orderStatus: orderStatusFor(recordId),
      };
    }),
  ),

  http.post(
    '*/facilities/:facilityId/fulfillment-queue/:itemId/lab-result',
    respond('json', async ({ params, request }) => {
      const item = db.fulfillmentQueue.find((q) => q.id === paramId(params, 'itemId'));
      if (!item) return notFound('fulfillment item');
      if (item.orderType !== 'lab') return conflict('lab results can only be attached to lab orders');
      if (item.status === 'rejected') return conflict('cannot attach a result to a rejected item');

      const formData = await request.formData().catch(() => null);
      const file = formData?.get('file');
      if (!(file instanceof File)) return conflict('a lab result file is required');
      if (file.size > 10 * 1024 * 1024) return conflict('file must be 10 MB or smaller');
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        return conflict('file must be a PDF, JPEG, or PNG');
      }

      const updated: FulfillmentQueueItem = {
        ...item,
        labResult: {
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: FACILITY_USER.id,
          storageKey: `mock/${paramId(params, 'facilityId')}/${item.id}/${file.name}`,
          downloadUrl: null,
        },
      };
      db.fulfillmentQueue = db.fulfillmentQueue.map((q) => (q.id === item.id ? updated : q));
      return updated;
    }),
  ),
];
