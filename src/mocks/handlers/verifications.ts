// Verification review queue (issue #64). Mirrors the same contracts
// src/services/admin-verification-service.ts calls: the three assumed
// endpoints (queue, detail, signed URL) plus the REAL
// `PATCH /doctors/:id/verification` decision endpoint, and the audit-trail
// listing (#43) that feeds the per-doctor decision history.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { notFound, paramId, respond } from '../helpers';
import type { AuditEvent, VerificationQueueItem } from '../../types/models';

const PAGE_SIZE = 10;

function queueRow(vrf: (typeof db.verifications)[number]): VerificationQueueItem {
  return {
    doctorProfileId: vrf.doctorProfileId,
    fullName: vrf.fullName,
    specialties: vrf.specialties,
    submittedAt: vrf.submittedAt,
    documentCount: vrf.documents.length,
    verificationStatus: vrf.verificationStatus,
  };
}

export const verificationHandlers = [
  http.get(
    '*/admin/verifications',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') ?? 'pending';
      const offset = Math.max(0, Number(url.searchParams.get('cursor') ?? '0') || 0);
      const matching = db.verifications
        .filter((entry) => entry.verificationStatus === status)
        // Oldest first, re-sorted here so the queue's promise holds across pages.
        .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
        .map(queueRow);
      const items = matching.slice(offset, offset + PAGE_SIZE);
      const nextOffset = offset + items.length;
      return { items, nextCursor: nextOffset < matching.length ? String(nextOffset) : null };
    }),
  ),

  http.get(
    '*/admin/verifications/:doctorProfileId',
    respond('json', ({ params }) => {
      const entry = db.verifications.find((vrf) => vrf.doctorProfileId === paramId(params, 'doctorProfileId'));
      if (!entry) return notFound('verification');
      return {
        profile: {
          id: entry.doctorProfileId,
          fullName: entry.fullName,
          email: entry.email,
          verificationStatus: entry.verificationStatus,
          specialties: entry.specialties,
          submittedAt: entry.submittedAt,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
        documents: entry.documents,
      };
    }),
  ),

  http.post(
    '*/admin/verifications/:doctorProfileId/documents/:documentId/signed-url',
    respond('json', ({ params }) => {
      const entry = db.verifications.find((vrf) => vrf.doctorProfileId === paramId(params, 'doctorProfileId'));
      if (!entry) return notFound('verification');
      const document = entry.documents.find((doc) => doc.id === paramId(params, 'documentId'));
      if (!document) return notFound('document');
      const expires = new Date(Date.now() + 10 * 60_000).toISOString();
      return {
        url: `https://files.example.test/verifications/${entry.doctorProfileId}/${document.id}?sig=mock-${Date.now()}`,
        expiresAt: expires,
      };
    }),
  ),

  // The REAL decision endpoint (docforum-core's doctors module): status flip
  // with an audit event written in the same transaction, and a no-op (no new
  // event) when the profile already has the status. `reason` and
  // `expectedUpdatedAt` are accepted and ignored here exactly as core's zod
  // schema does today — see ARCHITECTURE_ESSENTIALS "Known assumptions".
  http.patch(
    '*/doctors/:doctorProfileId/verification',
    respond('json', async ({ params, request }) => {
      const doctorProfileId = paramId(params, 'doctorProfileId');
      const entry = db.verifications.find((vrf) => vrf.doctorProfileId === doctorProfileId);
      if (!entry) return notFound('doctor profile');

      const body = (await request.json().catch(() => ({}))) as { status?: string };
      const status = body.status;
      if (status !== 'pending' && status !== 'verified' && status !== 'rejected') {
        return HttpResponse.json(
          { message: 'Mock API: status must be pending, verified or rejected' },
          { status: 400 },
        );
      }

      const now = new Date().toISOString();
      const from = entry.verificationStatus;
      if (from !== status) {
        entry.verificationStatus = status;
        entry.updatedAt = now;
        db.auditEvents.unshift({
          id: `aud-demo-${Date.now()}`,
          actorUserId: 'usr-admin-demo',
          actorRole: 'admin',
          entityType: 'DoctorProfile',
          entityId: doctorProfileId,
          action: 'doctor.verification_status_changed',
          fromState: from,
          toState: status,
          requestId: null,
          metadata: null,
          createdAt: now,
        });
      }

      return {
        id: entry.doctorProfileId,
        userId: entry.userId,
        fullName: entry.fullName,
        verificationStatus: entry.verificationStatus,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }),
  ),

  // Audit trail (#43) — newest first, filterable the way issue #64's history
  // and the audit viewer (#71) ask. Seed data is verification flips plus one
  // payment event; unknown filters simply return no events.
  http.get(
    '*/admin/audit-events',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const entityType = url.searchParams.get('entityType');
      const entityId = url.searchParams.get('entityId');
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50') || 50));
      let events: AuditEvent[] = [...db.auditEvents];
      if (entityType) events = events.filter((event) => event.entityType === entityType);
      if (entityId) events = events.filter((event) => event.entityId === entityId);
      events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
      return { items: events.slice(0, limit), nextCursor: null };
    }),
  ),
];
