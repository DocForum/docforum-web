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
import * as careThreadService from '../services/care-thread-service';
import * as consultationService from '../services/consultation-service';
import * as dependentsService from '../services/dependents-service';
import * as facilityService from '../services/facility-service';
import * as facilityTeamService from '../services/facility-team-service';
import * as healthService from '../services/health-profile-service';
import * as insightsService from '../services/insights-service';
import * as messagingService from '../services/messaging-service';
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
