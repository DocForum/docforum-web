// Facility team management and fulfillment queue endpoints.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import { FACILITY_USER } from '../fixtures';
import type {
  FacilityInvite,
  FulfillmentActionAttribution,
  FulfillmentQueueItem,
  PatientOrder,
} from '../../types/models';

function deriveOrderStatus(order: PatientOrder): PatientOrder['fulfillmentStatus'] {
  const items = order.items ?? [];
  if (items.every((item) => item.status === 'rejected')) return 'rejected';
  if (items.every((item) => item.quantityOutstanding <= 0)) return 'fulfilled';
  if (items.some((item) => item.quantityDispensed > 0)) return 'partially_fulfilled';
  return 'unfulfilled';
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
  orderItem.status =
    orderItem.quantityOutstanding === 0 ? 'dispensed' : 'partially_dispensed';
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

  http.post(
    '*/facilities/:facilityId/fulfillment-queue/:itemId/dispense',
    respond('json', async ({ params, request }) => {
      const facilityId = paramId(params, 'facilityId');
      const item = db.fulfillmentQueue.find(
        (q) => q.id === paramId(params, 'itemId') && q.facilityId === facilityId,
      );
      if (!item) return notFound('fulfillment item');

      const body = (await request.json().catch(() => ({}))) as { quantity?: number };
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return conflict('quantity must be a whole number of at least 1');
      }
      if (item.status === 'dispensed_elsewhere') {
        return conflict('item was already dispensed elsewhere');
      }
      if (item.canDispense === false) {
        return conflict(item.blockedReason ?? 'item cannot be dispensed by this facility');
      }

      const prescribed = item.quantityPrescribed ?? 1;
      const dispensed = item.quantityDispensed ?? 0;
      const outstanding =
        item.quantityOutstanding ?? Math.max(0, prescribed - dispensed);
      if (quantity > outstanding) {
        return conflict(`quantity exceeds the outstanding amount (${outstanding})`);
      }

      const facility = db.facilities.find((f) => f.id === facilityId);
      const facilityName = facility?.name ?? 'Mock facility (fake)';
      const now = new Date().toISOString();
      const newOutstanding = outstanding - quantity;

      item.quantityPrescribed = prescribed;
      item.quantityDispensed = dispensed + quantity;
      item.quantityOutstanding = newOutstanding;
      item.status = newOutstanding === 0 ? 'fulfilled' : 'partially_dispensed';
      item.canDispense = newOutstanding > 0;
      item.blockedReason = null;
      item.dispensedByFacilityId = facilityId;
      item.dispensedByFacilityName = facilityName;
      item.attribution = {
        action: item.orderType === 'prescription' ? 'dispensed' : 'sample_collected',
        performedByUserId: FACILITY_USER.id,
        performedByName: 'Frank Facility (fake)',
        performedByEmail: FACILITY_USER.email,
        performedByRole: 'owner',
        timestamp: now,
        notes: `Mock API: dispensed ${quantity} of ${prescribed} (fixture only).`,
      };

      syncOrderItem(item, facilityName, quantity, now);
      return item;
    }),
  ),

  http.post(
    '*/facilities/:facilityId/fulfillment-queue/:itemId/action',
    respond('json', async ({ params, request }) => {
      const item = db.fulfillmentQueue.find(
        (q) => q.id === paramId(params, 'itemId'),
      );
      if (!item) return notFound('fulfillment item');
      const body = (await request.json().catch(() => ({}))) as {
        action?: 'in_progress' | 'fulfilled' | 'rejected';
        notes?: string;
      };
      if (!body.action || !['in_progress', 'fulfilled', 'rejected'].includes(body.action)) {
        return conflict('action must be in_progress, fulfilled, or rejected');
      }
      if (item.status === 'fulfilled' || item.status === 'rejected') {
        return conflict('this queue item is already closed');
      }
      const action = body.action;
      const attribution: FulfillmentActionAttribution = {
        action:
          action === 'in_progress'
            ? 'verified'
            : action === 'rejected'
              ? 'rejected'
              : item.orderType === 'prescription'
                ? 'dispensed'
                : 'sample_collected',
        performedByUserId: FACILITY_USER.id,
        performedByName: 'Frank Facility (fake)',
        performedByEmail: FACILITY_USER.email,
        performedByRole: 'owner',
        timestamp: new Date().toISOString(),
        notes: body.notes ?? null,
      };
      const prescribed = item.quantityPrescribed ?? 1;
      const dispensed = item.quantityDispensed ?? 0;
      const outstanding =
        item.quantityOutstanding ?? Math.max(0, prescribed - dispensed);
      const updated: FulfillmentQueueItem = {
        ...item,
        status: action,
        attribution,
        quantityPrescribed: prescribed,
        quantityDispensed:
          action === 'fulfilled' ? prescribed : dispensed,
        quantityOutstanding: action === 'fulfilled' ? 0 : outstanding,
        canDispense: false,
        blockedReason: action === 'rejected' ? 'Rejected by facility.' : null,
      };
      db.fulfillmentQueue = db.fulfillmentQueue.map((q) => (q.id === item.id ? updated : q));

      const facility = db.facilities.find((f) => f.id === item.facilityId);
      if (action === 'fulfilled') {
        syncOrderItem(
          updated,
          facility?.name ?? 'Mock facility (fake)',
          Math.max(0, prescribed - dispensed),
          attribution.timestamp,
        );
      } else if (item.orderItemId) {
        const order = db.orders.find((o) => o.id === item.orderId);
        const orderItem = (order?.items ?? []).find((i) => i.id === item.orderItemId);
        if (order && orderItem && orderItem.quantityDispensed === 0) {
          orderItem.status = 'rejected';
          orderItem.canDispense = false;
          orderItem.blockedReason = 'Rejected by facility.';
          order.fulfillmentStatus = deriveOrderStatus(order);
        }
      }
      return updated;
    }),
  ),

  http.post(
    '*/orders/lab-orders/:itemId/result',
    respond('json', async ({ params, request }) => {
      const item = db.fulfillmentQueue.find((q) => q.id === paramId(params, 'itemId'));
      if (!item) return notFound('fulfillment item');
      if (item.orderType !== 'lab') return conflict('lab results can only be attached to lab orders');
      if (item.status === 'rejected') return conflict('cannot attach a result to a rejected item');
      if (item.labResult) {
        return HttpResponse.json(
          { message: 'A lab result is already attached', code: 'LAB_RESULT_ALREADY_ATTACHED' },
          { status: 409 },
        );
      }

      const contentType = request.headers.get('content-type') ?? '';
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(contentType)) {
        return HttpResponse.json(
          { message: 'Unsupported lab result type', code: 'LAB_RESULT_UNSUPPORTED_TYPE' },
          { status: 415 },
        );
      }
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return HttpResponse.json(
          { message: 'Lab result is too large', code: 'LAB_RESULT_TOO_LARGE' },
          { status: 413 },
        );
      }
      const matchesPdf = contentType === 'application/pdf'
        && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
      const matchesPng = contentType === 'image/png'
        && bytes.length >= 8
        && bytes[0] === 0x89
        && String.fromCharCode(...bytes.slice(1, 4)) === 'PNG';
      const matchesJpeg = contentType === 'image/jpeg'
        && bytes.length >= 3
        && bytes[0] === 0xff
        && bytes[1] === 0xd8
        && bytes[2] === 0xff;
      if (!matchesPdf && !matchesPng && !matchesJpeg) {
        return HttpResponse.json(
          { message: 'File contents do not match its declared type', code: 'LAB_RESULT_CONTENT_MISMATCH' },
          { status: 415 },
        );
      }
      const fileName = contentType === 'application/pdf'
        ? 'lab-result.pdf'
        : contentType === 'image/png'
          ? 'lab-result.png'
          : 'lab-result.jpg';

      const updated: FulfillmentQueueItem = {
        ...item,
        labResult: {
          fileName,
          mimeType: contentType,
          sizeBytes: bytes.byteLength,
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: FACILITY_USER.id,
          storageKey: `mock/${item.facilityId}/${item.id}/${fileName}`,
          downloadUrl: null,
        },
      };
      db.fulfillmentQueue = db.fulfillmentQueue.map((q) => (q.id === item.id ? updated : q));
      return updated;
    }),
  ),
];
