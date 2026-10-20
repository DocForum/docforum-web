// Tests for the mock API (issue #95). Each test drives the app's REAL
// service layer (src/services/*) through apiFetch → fetch → MSW, proving
// the handlers cover every endpoint the application uses and honour the
// dev panel's scenario/latency switches. Runs in the node environment so
// MSW's fetch interceptor wraps Node's global fetch.
// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { resetDb } from './db';
import { useMockStore } from './mock-store';
import { DOCTOR_USER, MOCK_ACCESS_TOKEN } from './fixtures';
import { ApiError } from '../services/api-client';
import * as authService from '../services/auth-service';
import * as accountService from '../services/account-service';
import * as adminClosuresService from '../services/admin-closures-service';
import * as careThreadService from '../services/care-thread-service';
import * as consultationService from '../services/consultation-service';
import * as disputesService from '../services/disputes-service';
import * as dependentsService from '../services/dependents-service';
import * as doctorTodayService from '../services/doctor-today-service';
import * as facilityService from '../services/facility-service';
import * as facilityTeamService from '../services/facility-team-service';
import * as fulfillmentService from '../services/fulfillment-service';
import * as healthService from '../services/health-profile-service';
import * as insightsService from '../services/insights-service';
import * as messagingService from '../services/messaging-service';
import * as ordersService from '../services/orders-service';
import * as paymentsService from '../services/payments-service';
import * as queueService from '../services/queue-service';
import { FACILITY_ID, PATIENT_PROFILE_ID } from './fixtures';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  useMockStore.setState({ scenario: 'normal', latencyMs: 0, activeRole: 'patient' });
});

describe('auth', () => {
  it('logs in a seeded persona by email', async () => {
    const session = await authService.login({
      email: DOCTOR_USER.email,
      password: 'whatever',
    });
    expect(session.user.role).toBe('doctor');
    expect(session.accessToken).toBe(MOCK_ACCESS_TOKEN);
  });

  it('logs an unknown email in as the dev panel active role', async () => {
    useMockStore.setState({ activeRole: 'doctor' });
    const session = await authService.login({
      email: 'someone@example.test',
      password: 'whatever',
    });
    expect(session.user.role).toBe('doctor');
    expect(session.user.email).toBe('someone@example.test');
  });

  it('rejects missing credentials with a 400 envelope', async () => {
    await expect(
      authService.login({ email: '', password: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('signs up a patient and logs out', async () => {
    const session = await authService.signup({
      role: 'patient',
      email: 'new.person@example.test',
      password: 'x',
      fullName: 'New Person (fake)',
    });
    expect(session.user.role).toBe('patient');
    // apiFetch returns the parsed JSON body — `null` for void endpoints.
    await expect(authService.logout(session.accessToken)).resolves.toBeNull();
  });

  it('claims an account', async () => {
    await expect(
      dependentsService.claimAccount({ token: 't', email: 'a@example.test', password: 'x' }),
    ).resolves.toBeNull();
  });
});

describe('dependents', () => {
  it('lists seeded dependents and adds a new one', async () => {
    const seeded = await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(seeded).toHaveLength(2);

    await dependentsService.addDependent(
      { fullName: 'New Fake Dependent', dateOfBirth: '2012-01-01', relationship: 'parent' },
      MOCK_ACCESS_TOKEN,
    );
    const after = await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(after).toHaveLength(3);
  });

  it('updates a dependent and manages handover invites', async () => {
    const updated = await dependentsService.updateDependent(
      'dep-demo-2',
      { fullName: 'Renamed Placeholder', dateOfBirth: '2010-07-15', relationship: 'guardian' },
      MOCK_ACCESS_TOKEN,
    );
    expect(updated.fullName).toBe('Renamed Placeholder');

    const invited = await dependentsService.sendHandoverInvite(
      'dep-demo-2',
      'junior.claim@example.test',
      MOCK_ACCESS_TOKEN,
    );
    expect(invited.handoverStatus).toBe('invited');
    expect(invited.claimEmail).toBe('junior.claim@example.test');

    const resent = await dependentsService.resendHandoverInvite('dep-demo-2', MOCK_ACCESS_TOKEN);
    expect(resent.claimInviteExpiresAt).toBeTruthy();
  });

  it('404s on an unknown dependent', async () => {
    await expect(
      dependentsService.updateDependent(
        'nope',
        { fullName: 'x', dateOfBirth: '2000-01-01', relationship: 'parent' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('health profile', () => {
  it('lists, adds, versions and deletes entries per section', async () => {
    const allergies = await healthService.listHealthEntries(
      PATIENT_PROFILE_ID,
      'allergies',
      MOCK_ACCESS_TOKEN,
    );
    expect(allergies).toHaveLength(1);

    const added = await healthService.addHealthEntry(
      PATIENT_PROFILE_ID,
      { section: 'allergies', name: 'Dust (fake)' },
      MOCK_ACCESS_TOKEN,
    );
    expect(added.version).toBe(1);

    const patched = await healthService.updateHealthEntry(
      PATIENT_PROFILE_ID,
      added.id,
      { name: 'Dust mites (fake)' },
      MOCK_ACCESS_TOKEN,
    );
    expect(patched.version).toBe(2);
    expect(patched.previousValue).toBe('Dust (fake)');

    await healthService.removeHealthEntry(PATIENT_PROFILE_ID, added.id, MOCK_ACCESS_TOKEN);
    const after = await healthService.listHealthEntries(
      PATIENT_PROFILE_ID,
      'allergies',
      MOCK_ACCESS_TOKEN,
    );
    expect(after).toHaveLength(1);
  });
});

describe('account', () => {
  it('requests, reads and downloads a data export', async () => {
    const requested = await accountService.requestDataExport('pw', MOCK_ACCESS_TOKEN);
    expect(requested.status).toBe('ready');

    const current = await accountService.getDataExportStatus(MOCK_ACCESS_TOKEN);
    expect(current?.id).toBe(requested.id);

    const blob = await accountService.downloadDataExport(requested.id, MOCK_ACCESS_TOKEN);
    const text = await blob.text();
    expect(text).toContain('FAKE DATA EXPORT');
  });

  it('deletes the account with a confirmation message', async () => {
    const response = await accountService.deleteAccount('pw', 'DELETE', MOCK_ACCESS_TOKEN);
    expect(response.success).toBe(true);
    expect(response.message).toContain('Mock API');
  });
});

describe('care threads', () => {
  it('lists threads for a profile and fetches one by id', async () => {
    const threads = await careThreadService.getCareThreads(PATIENT_PROFILE_ID, MOCK_ACCESS_TOKEN);
    expect(threads.length).toBeGreaterThan(0);

    const thread = await careThreadService.getCareThreadById(threads[0].id, MOCK_ACCESS_TOKEN);
    expect(thread.steps.length).toBeGreaterThan(0);
  });
});

describe('consultation notes', () => {
  it('fetches by appointment, signs off, and appends addenda', async () => {
    const note = await consultationService.getConsultationNote('apt-demo-2', MOCK_ACCESS_TOKEN);
    expect(note.signedAt).toBeNull();

    const signed = await consultationService.signOffNote(note.id, MOCK_ACCESS_TOKEN);
    expect(signed.signedAt).toBeTruthy();

    const addendum = await consultationService.addAddendum(
      note.id,
      { content: 'Demo addendum (fake).' },
      MOCK_ACCESS_TOKEN,
    );
    expect(addendum.noteId).toBe(note.id);
  });

  it('409s when signing off twice', async () => {
    await expect(
      consultationService.signOffNote('not-demo-signed', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('records an outcome, referral, and issued order', async () => {
    const record = await consultationService.recordConsultation(
      'apt-demo-2',
      { notes: 'Demo outcome notes (fake).', outcome: 'referred' },
      MOCK_ACCESS_TOKEN,
    );
    expect(record.outcome).toBe('referred');

    const referral = await consultationService.createConsultationReferral(
      record.id,
      { targetSpecialty: 'Cardiology', reason: 'Demo referral reason (fake).' },
      MOCK_ACCESS_TOKEN,
    );
    expect(referral.status).toBe('pending');

    const order = await consultationService.issueConsultationOrder(
      record.id,
      { orderType: 'lab_order', testName: 'Demo blood panel (fake)' },
      MOCK_ACCESS_TOKEN,
    );
    expect(order.medicationOrTest).toBe('Demo blood panel (fake)');
  });
});

describe('patient orders', () => {
  it('lists every version and selects a qualified facility for the current order', async () => {
    const orders = await ordersService.listMyOrders(MOCK_ACCESS_TOKEN);
    expect(orders.length).toBeGreaterThan(1);
    expect(orders.some((order) => order.id === 'ord-demo-rx-101')).toBe(true);

    const facilities = await ordersService.listQualifiedFacilities(
      'ord-demo-rx-102',
      MOCK_ACCESS_TOKEN,
    );
    expect(facilities.map((facility) => facility.id)).toEqual([
      FACILITY_ID,
      'fac-demo-pharmacy-2',
    ]);

    const selected = await ordersService.selectFulfillingFacility(
      'ord-demo-rx-102',
      { facilityId: FACILITY_ID, expectedVersion: 2 },
      MOCK_ACCESS_TOKEN,
    );
    expect(selected.selectedFacility?.id).toBe(FACILITY_ID);

    await expect(
      ordersService.selectFulfillingFacility(
        'ord-demo-rx-102',
        { facilityId: FACILITY_ID, expectedVersion: 1 },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('doctor today', () => {
  it('returns a structured intake for an appointment and 404s when missing', async () => {
    const intake = await doctorTodayService.getAppointmentIntake('apt-demo-3', MOCK_ACCESS_TOKEN);
    expect(intake?.chiefComplaint).toContain('Demo');

    await expect(
      doctorTodayService.getAppointmentIntake('apt-demo-2', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('doctor queue', () => {
  it('lists appointments, derives the queue, and starts/complete visits', async () => {
    const appointments = await queueService.listTodayAppointments(MOCK_ACCESS_TOKEN);
    expect(appointments.length).toBe(5);

    const queue = await queueService.listQueue(MOCK_ACCESS_TOKEN);
    expect(queue[0].queuePosition).toBe(1);

    const started = await queueService.startVisit('apt-demo-3', MOCK_ACCESS_TOKEN);
    expect(started.status).toBe('in_progress');

    const completed = await queueService.completeVisit('apt-demo-3', MOCK_ACCESS_TOKEN);
    expect(completed.status).toBe('completed');

    await expect(queueService.completeVisit('apt-demo-4', MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('applies the running-delay override', async () => {
    const delay = await queueService.getRunningDelay(MOCK_ACCESS_TOKEN);
    expect(delay.effectiveDelayMin).toBe(delay.computedDelayMin);

    const overridden = await queueService.updateRunningDelay(
      { manualOverrideMin: 25 },
      MOCK_ACCESS_TOKEN,
    );
    expect(overridden.effectiveDelayMin).toBe(25);

    const cleared = await queueService.updateRunningDelay(
      { manualOverrideMin: null },
      MOCK_ACCESS_TOKEN,
    );
    expect(cleared.manualOverrideMin).toBeNull();
    expect(cleared.effectiveDelayMin).toBe(cleared.computedDelayMin);
  });
});

describe('messaging', () => {
  it('filters threads and marks them read', async () => {
    const all = await messagingService.listThreads({}, MOCK_ACCESS_TOKEN);
    expect(all.threads.length).toBe(4);
    expect(messagingService.totalUnread(all.threads)).toBe(6);

    const unread = await messagingService.listThreads({ filter: 'unread' }, MOCK_ACCESS_TOKEN);
    expect(unread.threads.every((t) => t.unreadCount > 0)).toBe(true);

    await messagingService.markThreadRead('mth-demo-1', MOCK_ACCESS_TOKEN);
    const after = await messagingService.listThreads({}, MOCK_ACCESS_TOKEN);
    expect(after.threads.find((t) => t.id === 'mth-demo-1')?.unreadCount).toBe(0);
  });
});

describe('insights', () => {
  it('returns seeded insights and echoes the requested range', async () => {
    const insights = await insightsService.getDoctorPracticeInsights(MOCK_ACCESS_TOKEN);
    expect(insights.utilisation.weeks.length).toBeGreaterThan(0);

    const ranged = await insightsService.getDoctorPracticeInsights(MOCK_ACCESS_TOKEN, {
      preset: '7d',
      startDate: '2026-10-11',
      endDate: '2026-10-18',
    });
    expect(ranged.range.preset).toBe('7d');
    expect(ranged.range.startDate).toBe('2026-10-11');
  });
});

describe('facility finder', () => {
  it('filters by type and sorts by distance when coordinates are given', async () => {
    const all = await facilityService.getFacilities({}, MOCK_ACCESS_TOKEN);
    expect(all.length).toBe(3);

    const labs = await facilityService.getFacilities({ type: 'lab' }, MOCK_ACCESS_TOKEN);
    expect(labs.every((f) => f.type === 'lab')).toBe(true);

    const nearby = await facilityService.getFacilities(
      { lat: 6.5244, lng: 3.3792 },
      MOCK_ACCESS_TOKEN,
    );
    expect(nearby[0].id).toBe('fac-demo-pharmacy');
    expect(nearby[0].distanceKm).toBeLessThan(0.1);
  });
});

describe('facility team', () => {
  it('lists members and invites, and sends an invite', async () => {
    const members = await facilityTeamService.listFacilityMembers(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(members).toHaveLength(2);

    const invites = await facilityTeamService.listFacilityInvites(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(invites).toHaveLength(1);

    const invite = await facilityTeamService.inviteFacilityMember(
      FACILITY_ID,
      { email: 'more.staff@example.test', role: 'staff' },
      MOCK_ACCESS_TOKEN,
    );
    expect(invite.status).toBe('pending');

    await facilityTeamService.resendFacilityInvite(FACILITY_ID, invite.id, MOCK_ACCESS_TOKEN);
    await facilityTeamService.revokeFacilityInvite(FACILITY_ID, invite.id, MOCK_ACCESS_TOKEN);
    const after = await facilityTeamService.listFacilityInvites(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(after).toHaveLength(1);
  });

  it('refuses to remove the last owner', async () => {
    await expect(
      facilityTeamService.removeFacilityMember(FACILITY_ID, 'fmb-demo-owner', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });

    const removed = await facilityTeamService.removeFacilityMember(
      FACILITY_ID,
      'fmb-demo-staff',
      MOCK_ACCESS_TOKEN,
    );
    expect(removed.sessionsRevoked).toBe(true);
  });

  it('fulfills queue items with attribution', async () => {
    const queue = await facilityTeamService.getFulfillmentQueue(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(queue).toHaveLength(3);

    const updated = await facilityTeamService.updateFulfillmentItem(
      FACILITY_ID,
      'fuq-demo-1',
      'fulfilled',
      MOCK_ACCESS_TOKEN,
      'Demo note (fake)',
    );
    expect(updated.status).toBe('fulfilled');
    expect(updated.attribution?.performedByRole).toBe('owner');
    expect(updated.attribution?.action).toBe('dispensed');
  });
});

describe('facility fulfillment queue', () => {
  it('moves items in progress, refuses closed items, and attaches lab results', async () => {
    const moved = await fulfillmentService.updateFulfillmentStatus(
      FACILITY_ID,
      'fuq-demo-1',
      'in_progress',
      MOCK_ACCESS_TOKEN,
    );
    expect(moved.status).toBe('in_progress');
    expect(moved.attribution?.action).toBe('verified');

    await expect(
      fulfillmentService.updateFulfillmentStatus(
        FACILITY_ID,
        'fuq-demo-3',
        'rejected',
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });

    const file = new File(['demo lab result'], 'demo-result.pdf', {
      type: 'application/pdf',
    });
    const uploaded = await fulfillmentService.uploadFulfillmentLabResult(
      FACILITY_ID,
      'fuq-demo-2',
      file,
      MOCK_ACCESS_TOKEN,
    );
    expect(uploaded.labResult?.fileName).toBe('demo-result.pdf');
    expect(uploaded.labResult?.sizeBytes).toBe(file.size);

    await expect(
      fulfillmentService.uploadFulfillmentLabResult(
        FACILITY_ID,
        'fuq-demo-1',
        file,
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('payments', () => {
  it('links a wallet and drives an intent through fund → release', async () => {
    const wallet = await paymentsService.getOwnWalletLink(MOCK_ACCESS_TOKEN);
    expect(wallet?.stellarPublicKey).toContain('GDEMOFAKE');

    const relinked = await paymentsService.linkWallet('GNEWFAKEKEY', MOCK_ACCESS_TOKEN);
    expect(relinked.stellarPublicKey).toBe('GNEWFAKEKEY');

    const created = await paymentsService.createPaymentIntent(
      {
        orderType: 'prescription',
        orderId: 'ord-mock-new',
        patientProfileId: PATIENT_PROFILE_ID,
        facilityId: FACILITY_ID,
        amountStroops: '123456789',
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.status).toBe('created');
    expect(created.amountStroops).toBe('123456789'); // BigInt-as-string preserved

    const funded = await paymentsService.fundPaymentIntent(created.id, MOCK_ACCESS_TOKEN);
    expect(funded.status).toBe('escrowed');

    const released = await paymentsService.releasePaymentIntent(created.id, MOCK_ACCESS_TOKEN);
    expect(released.status).toBe('released');

    await expect(
      paymentsService.refundPaymentIntent(created.id, MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('admin closures', () => {
  it('lists, creates, updates and deletes closures', async () => {
    const seeded = await adminClosuresService.listClosures(MOCK_ACCESS_TOKEN);
    expect(seeded).toHaveLength(2);
    expect(seeded[0].facilityId).toBeNull(); // platform-wide

    const created = await adminClosuresService.createClosure(
      {
        name: 'Demo bank holiday (fake)',
        allDay: true,
        start: '2026-11-15T00:00:00.000Z',
        end: '2026-11-16T00:00:00.000Z',
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.status).toBe('active');
    expect(created.facilityId).toBeNull();

    const afterCreate = await adminClosuresService.listClosures(MOCK_ACCESS_TOKEN);
    expect(afterCreate).toHaveLength(3);

    const updated = await adminClosuresService.updateClosure(
      created.id,
      { id: created.id, name: 'Renamed closure (fake)', status: 'inactive' },
      MOCK_ACCESS_TOKEN,
    );
    expect(updated.name).toBe('Renamed closure (fake)');
    expect(updated.status).toBe('inactive');
    expect(updated.allDay).toBe(true); // untouched fields survive a partial update

    await adminClosuresService.deleteClosure(created.id, MOCK_ACCESS_TOKEN);
    const afterDelete = await adminClosuresService.listClosures(MOCK_ACCESS_TOKEN);
    expect(afterDelete).toHaveLength(2);

    await expect(
      adminClosuresService.updateClosure('clo-does-not-exist', { id: 'clo-does-not-exist', name: 'x' }, MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('scopes the list to a facility when facilityId is given', async () => {
    // The closures hook appends ?facilityId= to the same path the service
    // uses — exercise that query filter exactly as the UI does.
    const res = await fetch(
      `http://localhost:4000/admin/closures?facilityId=${FACILITY_ID}`,
      { headers: { Authorization: `Bearer ${MOCK_ACCESS_TOKEN}` } },
    );
    const scoped = (await res.json()) as { id: string; facilityId: string | null }[];
    expect(scoped).toHaveLength(1);
    expect(scoped[0].facilityId).toBe(FACILITY_ID);

    const all = await adminClosuresService.listClosures(MOCK_ACCESS_TOKEN);
    expect(all).toHaveLength(2);
  });

  it('reports booked appointments inside a closure window', async () => {
    const seeded = await adminClosuresService.listClosures(MOCK_ACCESS_TOKEN);
    // Seeded closures sit in Nov/Dec, fixture appointments on 2026-10-18.
    await expect(
      adminClosuresService.listAffectedAppointments(seeded[0].id, MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);

    const demoDay = await adminClosuresService.createClosure(
      {
        name: 'Demo clinic day closure (fake)',
        allDay: true,
        start: '2026-10-18T00:00:00.000Z',
        end: '2026-10-19T00:00:00.000Z',
      },
      MOCK_ACCESS_TOKEN,
    );
    const affected = await adminClosuresService.listAffectedAppointments(
      demoDay.id,
      MOCK_ACCESS_TOKEN,
    );
    // Fixture appointments on 2026-10-18: completed/in_progress/no_show are
    // left alone — only scheduled/checked_in bookings are "affected".
    expect(affected.map((a) => a.appointmentId).sort()).toEqual(['apt-demo-3', 'apt-demo-4']);
    expect(affected.every((a) => a.patientName.length > 0)).toBe(true);

    await expect(
      adminClosuresService.listAffectedAppointments('clo-missing', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('admin disputes', () => {
  it('pages open disputes oldest first and returns a full detail', async () => {
    const first = await disputesService.listDisputes({ status: 'open' }, MOCK_ACCESS_TOKEN);
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBe('2');
    expect(first.items[0].id).toBe('dsp-demo-1');

    const second = await disputesService.listDisputes(
      { status: 'open', cursor: first.nextCursor },
      MOCK_ACCESS_TOKEN,
    );
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();

    const openedAt = [...first.items, ...second.items].map((item) => Date.parse(item.openedAt));
    expect(openedAt).toEqual([...openedAt].sort((a, b) => a - b));

    const detail = await disputesService.getDispute('dsp-demo-1', MOCK_ACCESS_TOKEN);
    expect(detail.patientReport.reason).toBe('not_received');
    expect(detail.facilityProof?.attachments).toHaveLength(1);
    expect(detail.payment.status).toBe('escrowed');
  });

  it('mints a new signed attachment URL on every request', async () => {
    const first = await disputesService.getAttachmentSignedUrl('dsp-demo-1', 'att-demo-1', MOCK_ACCESS_TOKEN);
    const second = await disputesService.getAttachmentSignedUrl('dsp-demo-1', 'att-demo-1', MOCK_ACCESS_TOKEN);

    expect(first.url).toMatch(/^https:\/\/files\.example\.test\//);
    expect(first.url).not.toBe(second.url);
    expect(Date.parse(first.expiresAt)).toBeGreaterThan(Date.now());
  });

  it('resolves once, moves escrow and rejects stale or malformed resolutions', async () => {
    const detail = await disputesService.getDispute('dsp-demo-1', MOCK_ACCESS_TOKEN);

    await expect(
      disputesService.resolveDispute(
        detail.id,
        { resolution: 'facility', notes: 'Too short', expectedUpdatedAt: detail.updatedAt },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 422 });

    await expect(
      disputesService.resolveDispute(
        detail.id,
        { resolution: 'facility', notes: 'Proof matches the courier record', expectedUpdatedAt: 'stale' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });

    const resolved = await disputesService.resolveDispute(
      detail.id,
      { resolution: 'facility', notes: 'Proof matches the courier record', expectedUpdatedAt: detail.updatedAt },
      MOCK_ACCESS_TOKEN,
    );
    expect(resolved.status).toBe('resolved_facility');
    expect(resolved.resolution).toBe('facility');
    expect(resolved.payment.status).toBe('released');
    expect(resolved.timeline.at(-1)?.kind).toBe('resolved');
    expect(resolved.updatedAt).not.toBe(detail.updatedAt);

    const intent = await paymentsService.getPaymentIntent(detail.payment.intentId, MOCK_ACCESS_TOKEN);
    expect(intent.status).toBe('released');

    await expect(
      disputesService.resolveDispute(
        detail.id,
        { resolution: 'patient', notes: 'A second attempt should not apply', expectedUpdatedAt: resolved.updatedAt },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('dev panel scenarios', () => {
  it('forces 500s in the "error" scenario', async () => {
    useMockStore.setState({ scenario: 'error' });
    const error = await dependentsService
      .listDependents(MOCK_ACCESS_TOKEN)
      .then(() => null)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toContain('forced server error');
  });

  it('returns empty lists and null singletons in the "empty" scenario', async () => {
    useMockStore.setState({ scenario: 'empty' });
    await expect(dependentsService.listDependents(MOCK_ACCESS_TOKEN)).resolves.toEqual([]);
    await expect(
      queueService.listTodayAppointments(MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);
    await expect(
      facilityTeamService.getFulfillmentQueue(FACILITY_ID, MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);
    await expect(accountService.getDataExportStatus(MOCK_ACCESS_TOKEN)).resolves.toBeNull();
    await expect(paymentsService.getOwnWalletLink(MOCK_ACCESS_TOKEN)).resolves.toBeNull();
  });

  it('delays responses by the configured latency', async () => {
    useMockStore.setState({ latencyMs: 200 });
    const started = Date.now();
    await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(Date.now() - started).toBeGreaterThanOrEqual(180);
  });
});
