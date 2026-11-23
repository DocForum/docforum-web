// Admin console endpoints (Phase W6): audit + access log viewer, stuck
// referrals, system health and feature flags. These exist so demo mode can
// actually open every admin screen; before this they were only reachable
// against a real docforum-core. Shapes follow src/types/models.ts, whose W6
// admin shapes are assumed contracts — see ARCHITECTURE_ESSENTIALS.md
// "Known assumptions — Phase W6".
import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import { ADMIN_USER } from '../fixtures';
import type { AuditEvent, FeatureFlag } from '../../types/models';

/** Simple offset cursor — opaque to the UI, which only passes it back. */
function readCursor(request: Request): number {
  const cursor = new URL(request.url).searchParams.get('cursor');
  const offset = Number(cursor ?? '0');
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

function readLimit(request: Request, fallback = 50): number {
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(200, Math.max(1, Math.trunc(limit)));
}

function page<T>(items: T[], request: Request) {
  const offset = readCursor(request);
  const limit = readLimit(request);
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  return { items: slice, nextCursor: nextOffset < items.length ? String(nextOffset) : null };
}

export const adminHandlers = [
  http.get(
    '*/admin/audit-events',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const entityType = url.searchParams.get('entityType');
      const entityId = url.searchParams.get('entityId');
      const actorUserId = url.searchParams.get('actorUserId');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

      let events: AuditEvent[] = [...db.auditEvents].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      if (entityType) events = events.filter((e) => e.entityType === entityType);
      if (entityType && entityId) events = events.filter((e) => e.entityId === entityId);
      if (actorUserId) events = events.filter((e) => e.actorUserId === actorUserId);
      if (from) events = events.filter((e) => e.createdAt.slice(0, 10) >= from.slice(0, 10));
      if (to) events = events.filter((e) => e.createdAt.slice(0, 10) <= to.slice(0, 10));

      return page(events, request);
    }),
  ),

  http.get(
    '*/admin/access-logs',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const entityType = url.searchParams.get('entityType');
      const entityId = url.searchParams.get('entityId');
      const actorUserId = url.searchParams.get('actorUserId');

      let logs = [...db.accessLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (entityType) logs = logs.filter((l) => l.entityType === entityType);
      if (entityType && entityId) logs = logs.filter((l) => l.entityId === entityId);
      if (actorUserId) logs = logs.filter((l) => l.actorUserId === actorUserId);

      return page(logs, request);
    }),
  ),

  http.get(
    '*/admin/referrals',
    respond('json', ({ request }) => {
      const items = [...db.stuckReferrals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return page(items, request);
    }),
  ),

  http.get(
    '*/admin/doctors',
    respond('list', ({ request }) => {
      const url = new URL(request.url);
      const specialtyId = url.searchParams.get('specialtyId');
      const verificationStatus = url.searchParams.get('verificationStatus');
      return db.doctorAvailability.filter(
        (doctor) =>
          (!specialtyId || doctor.specialties.some((s) => s.id === specialtyId)) &&
          (!verificationStatus || doctor.verificationStatus === verificationStatus),
      );
    }),
  ),

  http.post(
    '*/admin/referrals/:id/reassign',
    respond('json', async ({ params, request }) => {
      const id = paramId(params);
      const referral = db.stuckReferrals.find((r) => r.id === id);
      if (!referral) return notFound('referral');
      const body = (await request.json().catch(() => ({}))) as {
        targetDoctorId?: string;
        reason?: string;
        expectedUpdatedAt?: string;
      };
      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== referral.updatedAt) {
        return conflict('referral changed since you loaded it (mock expectedUpdatedAt check)');
      }
      if (!body.targetDoctorId) return conflict('targetDoctorId is required');
      if (!body.reason) return conflict('a reason is required');

      const doctor = db.doctorAvailability.find((d) => d.id === body.targetDoctorId);
      referral.targetDoctorId = body.targetDoctorId;
      referral.targetDoctor = doctor ? { id: doctor.id, fullName: doctor.fullName } : null;
      referral.updatedAt = new Date().toISOString();
      // A reassigned referral leaves the stuck queue.
      db.stuckReferrals = db.stuckReferrals.filter((r) => r.id !== id);
      db.auditEvents.unshift({
        id: `aud-mock-${Date.now()}`,
        actorUserId: ADMIN_USER.id,
        actorRole: 'admin',
        entityType: 'Referral',
        entityId: id,
        action: 'referral.reassigned',
        fromState: 'pending',
        toState: 'pending',
        requestId: null,
        metadata: { reason: body.reason },
        createdAt: new Date().toISOString(),
      });
      const { stuckReason: _reason, targetSpecialty: _specialty, referringDoctor: _ref, targetDoctor: _target, chain: _chain, ...plain } = referral;
      return plain;
    }),
  ),

  http.post(
    '*/admin/referrals/:id/cancel',
    respond('json', async ({ params, request }) => {
      const id = paramId(params);
      const referral = db.stuckReferrals.find((r) => r.id === id);
      if (!referral) return notFound('referral');
      const body = (await request.json().catch(() => ({}))) as {
        reason?: string;
        expectedUpdatedAt?: string;
      };
      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== referral.updatedAt) {
        return conflict('referral changed since you loaded it (mock expectedUpdatedAt check)');
      }
      if (!body.reason) return conflict('a reason is required');
      db.stuckReferrals = db.stuckReferrals.filter((r) => r.id !== id);
      db.auditEvents.unshift({
        id: `aud-mock-${Date.now()}`,
        actorUserId: ADMIN_USER.id,
        actorRole: 'admin',
        entityType: 'Referral',
        entityId: id,
        action: 'referral.cancelled',
        fromState: 'pending',
        toState: 'expired',
        requestId: null,
        metadata: { reason: body.reason },
        createdAt: new Date().toISOString(),
      });
      const { stuckReason: _reason, targetSpecialty: _specialty, referringDoctor: _ref, targetDoctor: _target, chain: _chain, ...plain } = referral;
      return plain;
    }),
  ),

  // Readiness answers 200 even when degraded (only "not ready" is 503).
  http.get('*/health/ready', respond('json', () => db.readiness)),

  http.get(
    '*/admin/jobs',
    respond('list', () => db.backgroundJobs),
  ),

  http.post(
    '*/admin/jobs/:name/run',
    respond('json', ({ params }) => {
      const name = paramId(params, 'name');
      const job = db.backgroundJobs.find((j) => j.name === name);
      if (!job) return notFound('job');
      if (job.running) return conflict(`job "${name}" is already running`);
      const now = new Date().toISOString();
      const run = {
        id: `run-mock-${Date.now()}`,
        job: name,
        status: 'succeeded' as const,
        startedAt: now,
        finishedAt: now,
        error: null,
        itemsProcessed: 0,
        trigger: 'manual' as const,
      };
      job.lastRun = run;
      job.lastSuccess = run;
      job.nextRunAt = new Date(Date.now() + 5 * 60_000).toISOString();
      return run;
    }),
  ),

  http.get('*/admin/outbox', respond('json', () => db.outbox)),

  http.get('*/admin/flags', respond('list', () => db.featureFlags)),

  http.patch(
    '*/admin/flags/:key',
    respond('json', async ({ params, request }) => {
      const key = paramId(params, 'key');
      const flag = db.featureFlags.find((f) => f.key === key);
      if (!flag) return notFound('feature flag');
      const body = (await request.json().catch(() => ({}))) as Partial<FeatureFlag> & {
        expectedUpdatedAt?: string;
      };
      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== flag.updatedAt) {
        return conflict('feature flag changed since you loaded it (mock expectedUpdatedAt check)');
      }
      if (body.enabled !== undefined) flag.enabled = body.enabled;
      if (body.rolloutPercentage !== undefined) flag.rolloutPercentage = body.rolloutPercentage;
      if (body.targeting !== undefined) flag.targeting = body.targeting;
      flag.updatedAt = new Date().toISOString();
      db.auditEvents.unshift({
        id: `aud-mock-${Date.now()}`,
        actorUserId: ADMIN_USER.id,
        actorRole: 'admin',
        entityType: 'FeatureFlag',
        entityId: flag.id,
        action: 'feature_flag.updated',
        fromState: null,
        toState: flag.enabled ? 'on' : 'off',
        requestId: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      });
      return flag;
    }),
  ),
];
