// Fulfilment disputes (issue #76). Dev-mock only: the contract itself is
// assumed until docforum-core#76 lands (see ARCHITECTURE_ESSENTIALS.md).
// Cursor pagination is faked with a numeric offset so the queue's "load more"
// path is exercised with a deliberately small page size.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type { DisputeResolution, FulfillmentDispute } from '../../types/models';

const PAGE_SIZE = 2;
const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

function sortByOpenedAt(disputes: FulfillmentDispute[]): FulfillmentDispute[] {
  return [...disputes].sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

function nextUpdatedAt(previous: string, now: string): string {
  // The mock clock can move backwards between tests; a conflict is checked
  // against the exact value the client saw, so never return `previous`.
  return now === previous ? new Date(Date.parse(now) + 1).toISOString() : now;
}

export const disputesHandlers = [
  http.get(
    '*/admin/disputes',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') ?? 'open';
      const offset = Math.max(0, Number(url.searchParams.get('cursor') ?? '0') || 0);
      const matching = sortByOpenedAt(db.disputes.filter((dispute) => dispute.status === status));
      const items = matching.slice(offset, offset + PAGE_SIZE);
      const nextOffset = offset + items.length;
      return {
        items,
        nextCursor: nextOffset < matching.length ? String(nextOffset) : null,
      };
    }),
  ),

  http.get(
    '*/admin/disputes/:disputeId',
    respond('json', ({ params }) => {
      const dispute = db.disputes.find((candidate) => candidate.id === paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');
      return dispute;
    }),
  ),

  http.post(
    '*/admin/disputes/:disputeId/resolve',
    respond('json', async ({ params, request }) => {
      const dispute = db.disputes.find((candidate) => candidate.id === paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');

      const body = (await request.json().catch(() => ({}))) as {
        resolution?: DisputeResolution;
        notes?: string;
        expectedUpdatedAt?: string;
      };

      if (dispute.status !== 'open') {
        return conflict('this dispute is already resolved');
      }
      if (body.expectedUpdatedAt !== dispute.updatedAt) {
        return conflict('the dispute changed since it was loaded');
      }
      if (body.resolution !== 'facility' && body.resolution !== 'patient') {
        return HttpResponse.json({ message: 'Mock API: resolution must be facility or patient' }, { status: 422 });
      }
      const notes = (body.notes ?? '').trim();
      if (notes.length < 10) {
        return HttpResponse.json({ message: 'Mock API: resolution notes are too short' }, { status: 422 });
      }

      const now = new Date().toISOString();
      const resolvedStatus = body.resolution === 'facility' ? 'resolved_facility' : 'resolved_patient';
      dispute.status = resolvedStatus;
      dispute.resolution = body.resolution;
      dispute.resolutionNotes = notes;
      dispute.resolvedAt = now;
      dispute.resolvedBy = 'Admin (mock)';
      dispute.updatedAt = nextUpdatedAt(dispute.updatedAt, now);

      const intent = db.paymentIntents.find((candidate) => candidate.id === dispute.payment.intentId);
      if (intent && intent.status === 'escrowed') {
        intent.status = body.resolution === 'facility' ? 'released' : 'refunded';
        intent.updatedAt = now;
      }
      if (dispute.payment.status === 'escrowed') {
        dispute.payment.status = body.resolution === 'facility' ? 'released' : 'refunded';
      }

      dispute.timeline.push({
        id: `tl-${dispute.id}-resolved-${Date.now()}`,
        at: now,
        actorRole: 'admin',
        actorName: 'Admin (mock)',
        kind: 'resolved',
        summary: `Resolved for the ${body.resolution}. ${notes}`,
      });

      return dispute;
    }),
  ),

  http.post(
    '*/admin/disputes/:disputeId/attachments/:attachmentId/signed-url',
    respond('json', ({ params }) => {
      const dispute = db.disputes.find((candidate) => candidate.id === paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');
      const attachment = dispute.facilityProof?.attachments.find(
        (candidate) => candidate.id === paramId(params, 'attachmentId'),
      );
      if (!attachment) return notFound('attachment');

      const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_MS).toISOString();
      const signature = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      return {
        url:
          `https://files.example.test/disputes/${encodeURIComponent(dispute.id)}/` +
          `${encodeURIComponent(attachment.id)}?expires=${encodeURIComponent(expiresAt)}&signature=${signature}`,
        expiresAt,
      };
    }),
  ),
];
