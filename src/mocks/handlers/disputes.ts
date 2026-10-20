// Admin fulfilment-dispute endpoints (assumed contract — see
// src/types/models.ts and ARCHITECTURE_ESSENTIALS.md "Known assumptions").
// Resolution only mutates local mock state: no Stellar or escrow calls here
// (hard rule 1). Attachment fixtures carry no URLs; this handler mints a
// fresh signed URL per request, mirroring docforum-core.
import { HttpResponse, http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type {
  DisputeResolution,
  FulfillmentDisputeDetail,
  FulfillmentDisputeSummary,
  SignedAttachmentUrl,
} from '../../types/models';

const PAGE_SIZE = 50;
const NOTE_MIN = 10;
const NOTE_MAX = 1000;
const SIGNED_URL_TTL_SECONDS = 5 * 60;

let signedUrlSerial = 0;

function badRequest(message: string) {
  return HttpResponse.json({ message: `Mock API: ${message}` }, { status: 400 });
}

function toSummary(dispute: FulfillmentDisputeDetail): FulfillmentDisputeSummary {
  return {
    id: dispute.id,
    orderId: dispute.orderId,
    orderType: dispute.orderType,
    orderItemName: dispute.orderItemName,
    patientName: dispute.patientName,
    facilityId: dispute.facilityId,
    facilityName: dispute.facilityName,
    amountStroops: dispute.amountStroops,
    asset: dispute.asset,
    status: dispute.status,
    openedAt: dispute.openedAt,
    updatedAt: dispute.updatedAt,
    reportExcerpt: dispute.reportExcerpt,
    attachmentCount: dispute.attachmentCount,
  };
}

function findDispute(id: string): FulfillmentDisputeDetail | undefined {
  return db.disputes.find((dispute) => dispute.id === id);
}

export const disputesHandlers = [
  http.get(
    '*/admin/disputes',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') ?? 'open';
      const matches = db.disputes
        .filter((dispute) => status === 'all' || dispute.status === status)
        .sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));

      const cursor = Number(url.searchParams.get('cursor') ?? '0');
      const offset = Number.isFinite(cursor) && cursor > 0 ? Math.floor(cursor) : 0;
      const page = matches.slice(offset, offset + PAGE_SIZE);
      return {
        items: page.map(toSummary),
        nextCursor: offset + PAGE_SIZE < matches.length ? String(offset + PAGE_SIZE) : null,
      };
    }),
  ),

  http.get(
    '*/admin/disputes/:disputeId',
    respond('json', ({ params }) => {
      const dispute = findDispute(paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');
      return dispute;
    }),
  ),

  http.post(
    '*/admin/disputes/:disputeId/attachments/:attachmentId/signed-url',
    respond('json', ({ params }) => {
      const dispute = findDispute(paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');
      const attachment = dispute.attachments.find((item) => item.id === paramId(params, 'attachmentId'));
      if (!attachment) return notFound('attachment');

      signedUrlSerial += 1;
      const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
      const paramsForUrl = new URLSearchParams({
        expires: String(Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS),
        signature: `mock-${signedUrlSerial}`,
      });
      return {
        url: `https://files.example.test/disputes/${encodeURIComponent(dispute.id)}/${encodeURIComponent(attachment.id)}?${paramsForUrl.toString()}`,
        expiresAt,
      } satisfies SignedAttachmentUrl;
    }),
  ),

  http.post(
    '*/admin/disputes/:disputeId/resolve',
    respond('json', async ({ params, request }) => {
      const dispute = findDispute(paramId(params, 'disputeId'));
      if (!dispute) return notFound('dispute');

      const body = (await request.json().catch(() => ({}))) as {
        resolution?: unknown;
        note?: unknown;
        expectedUpdatedAt?: unknown;
      };

      if (dispute.status !== 'open') {
        return conflict('this dispute is already resolved; resolutions are final');
      }
      if (body.expectedUpdatedAt !== dispute.updatedAt) {
        return conflict('this dispute changed since you loaded it');
      }
      if (body.resolution !== 'facility' && body.resolution !== 'patient') {
        return badRequest('resolution must be "facility" or "patient".');
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length < NOTE_MIN || note.length > NOTE_MAX) {
        return badRequest(`note must be ${NOTE_MIN}–${NOTE_MAX} characters.`);
      }

      const resolution = body.resolution as DisputeResolution;
      const now = new Date().toISOString();
      dispute.status = resolution === 'facility' ? 'resolved_facility' : 'resolved_patient';
      dispute.resolution = resolution;
      dispute.resolutionNote = note;
      dispute.resolvedAt = now;
      dispute.resolvedBy = 'Al Admin (demo)';
      dispute.updatedAt = now;
      dispute.timeline = [
        ...dispute.timeline,
        {
          id: `dtl-${dispute.id}-${dispute.timeline.length + 1}`,
          kind: 'resolved',
          at: now,
          actor: 'Al Admin (demo)',
          actorRole: 'admin',
          summary:
            resolution === 'facility'
              ? 'Resolved for the facility — escrow released.'
              : 'Resolved for the patient — escrow refunded.',
        },
      ];

      // The real backend settles the escrow as part of the resolution. The
      // mock only moves its local payment-intent state.
      const intent = db.paymentIntents.find((item) => item.id === dispute.paymentIntentId);
      if (intent && intent.status === 'escrowed') {
        intent.status = resolution === 'facility' ? 'released' : 'refunded';
        intent.stellarTxHash = `txdemo${String(Date.now()).padStart(52, '0')}`;
        intent.updatedAt = now;
      }

      return dispute;
    }),
  ),
];
