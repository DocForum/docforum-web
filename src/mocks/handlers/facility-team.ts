// Facility team management and fulfillment queue endpoints.
import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import { FACILITY_USER } from '../fixtures';
import type {
  FacilityInvite,
  FulfillmentActionAttribution,
  FulfillmentQueueItem,
} from '../../types/models';

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
    respond('list', () => db.fulfillmentQueue),
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
      const updated: FulfillmentQueueItem = { ...item, status: action, attribution };
      db.fulfillmentQueue = db.fulfillmentQueue.map((q) => (q.id === item.id ? updated : q));
      return updated;
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
