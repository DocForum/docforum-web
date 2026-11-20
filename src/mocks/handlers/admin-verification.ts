// Per-specialty verification review endpoints (issue #65) — assumed
// contract, pending docforum-core#51. See ARCHITECTURE_ESSENTIALS.md
// "Known assumptions — Phase W6".
import { HttpResponse, http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type { ClaimAge } from '../../services/admin-verification-service';
import type { ClaimDecision, ReviewSpecialtyClaimInput, Specialty } from '../../types/models';

/** Catalog for the filter dropdown (assumed — docforum-core#23). */
const SPECIALTIES: Specialty[] = [
  { id: 'spec-cardiology', name: 'Cardiology', slug: 'cardiology' },
  { id: 'spec-neurology', name: 'Neurology', slug: 'neurology' },
  { id: 'spec-dermatology', name: 'Dermatology', slug: 'dermatology' },
  { id: 'spec-general', name: 'General practice', slug: 'general-practice' },
];

const AGE_MS: Record<ClaimAge, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
  '168h': 168 * 60 * 60 * 1000,
};

const PAGE_SIZE = 20;

/** A tiny fake PDF, so "View document" has real bytes to open. */
const FAKE_PDF = new TextEncoder().encode(
  '%PDF-1.4\n% Demo fixture credential — obviously fake, not a real certificate.\n%%EOF\n',
);

export const adminVerificationHandlers = [
  http.get(
    '*/admin/specialty-verifications',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      if (status && status !== 'pending') return [];
      const specialtyId = url.searchParams.get('specialtyId');
      const olderThan = url.searchParams.get('olderThan') as ClaimAge | null;
      const cursor = Number(url.searchParams.get('cursor') ?? '0');
      const minAgeMs = olderThan && olderThan in AGE_MS ? AGE_MS[olderThan] : null;

      const rows = db.specialtyClaims
        .filter((claim) => claim.status === 'pending')
        .filter((claim) => !specialtyId || claim.specialtyId === specialtyId)
        .filter((claim) => (minAgeMs ? Date.now() - Date.parse(claim.createdAt) >= minAgeMs : true))
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

      const items = rows.slice(cursor, cursor + PAGE_SIZE);
      const nextCursor = cursor + PAGE_SIZE < rows.length ? String(cursor + PAGE_SIZE) : null;
      return { items, nextCursor };
    }),
  ),

  http.get(
    '*/admin/specialty-verifications/:claimId/credential',
    respond('json', ({ params }) => {
      const claim = db.specialtyClaims.find((c) => c.id === paramId(params, 'claimId'));
      if (!claim) return notFound('claim');
      if (!claim.credential) return notFound('credential');
      return new HttpResponse(FAKE_PDF, {
        headers: { 'content-type': claim.credential.mimeType },
      });
    }),
  ),

  http.patch(
    '*/admin/specialty-verifications/:claimId',
    respond('json', async ({ params, request }) => {
      const claim = db.specialtyClaims.find((c) => c.id === paramId(params, 'claimId'));
      if (!claim) return notFound('claim');
      const body = (await request.json().catch(() => ({}))) as Partial<ReviewSpecialtyClaimInput>;

      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== claim.updatedAt) {
        return conflict('claim was already reviewed or updated by someone else');
      }
      const decision: ClaimDecision = body.decision === 'reject' ? 'reject' : 'approve';
      const reason = (body.reason ?? '').trim();
      if (decision === 'reject' && reason.length < 10) {
        return HttpResponse.json(
          { message: 'A rejection must tell the doctor what to fix or resubmit (at least 10 characters).' },
          { status: 422 },
        );
      }

      const updated = {
        ...claim,
        status: decision === 'approve' ? ('verified' as const) : ('rejected' as const),
        rejectionReason: decision === 'reject' ? reason : claim.rejectionReason,
        reviewedById: 'usr-admin-demo',
        reviewedByName: 'al.admin@example.test',
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.specialtyClaims = db.specialtyClaims.map((c) => (c.id === claim.id ? updated : c));
      return updated;
    }),
  ),

  http.get('*/specialties', respond('list', () => SPECIALTIES)),
];
