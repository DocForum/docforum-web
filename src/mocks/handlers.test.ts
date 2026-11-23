// Tests for the mock API (issue #95). Each test drives the app's REAL
// service layer (src/services/*) through apiFetch → fetch → MSW, proving
// the handlers cover every endpoint the application uses and honour the
// dev panel's scenario/latency switches. Runs in the node environment so
// MSW's fetch interceptor wraps Node's global fetch.
// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
// The server is started once for the whole run by src/test/setup.ts (issue
// #105). This file used to create a second one; two MSW servers in one worker
// double-intercept every request, so it now shares the single instance and
// only resets the in-memory database between cases.
import { db, resetDb } from './db';
import { useMockStore } from './mock-store';
import { DOCTOR_USER, MOCK_ACCESS_TOKEN } from './fixtures';
import { ApiError, apiFetch } from '../services/api-client';
/** A date of birth exactly `years` ago today: minors vs. the age of majority. */
function dateYearsAgo(years: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
import * as authService from '../services/auth-service';
import * as accountService from '../services/account-service';
import * as adminClosuresService from '../services/admin-closures-service';
import * as careThreadService from '../services/care-thread-service';
import * as consultationService from '../services/consultation-service';
import * as disputesService from '../services/disputes-service';
import * as dependentsService from '../services/dependents-service';
import * as doctorTodayService from '../services/doctor-today-service';
import * as facilityService from '../services/facility-service';
import * as facilitySettingsService from '../services/facility-settings-service';
import * as facilityTeamService from '../services/facility-team-service';
import * as fulfillmentService from '../services/fulfillment-service';
import * as healthService from '../services/health-profile-service';
import * as insightsService from '../services/insights-service';
import * as integrationsService from '../services/integrations-service';
import * as messagingService from '../services/messaging-service';
import * as myFlagsService from '../services/my-flags-service';
import * as notificationPreferencesService from '../services/notification-preferences-service';
import * as notificationsService from '../services/notifications-service';
import * as ordersService from '../services/orders-service';
import * as paymentHistoryService from '../services/payment-history-service';
import * as paymentsService from '../services/payments-service';
import * as prescriptionsService from '../services/prescriptions-service';
import * as queueService from '../services/queue-service';
import * as searchService from '../services/search-service';
import * as verificationService from '../services/admin-verification-service';
import * as auditService from '../services/audit-service';
import * as sessionTimeoutService from '../services/session-timeout-service';
import * as systemHealthService from '../services/system-health-service';
import { FACILITY_ID, PATIENT_PROFILE_ID } from './fixtures';

beforeEach(() => {
  resetDb();
  useMockStore.setState({ scenario: 'normal', latencyMs: 0, activeRole: 'patient', flagOverrides: {} });
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

  it('clears login lockouts without revealing whether an account exists', async () => {
    const cleared = await systemHealthService.clearLoginAttempts(
      { email: 'locked.out@example.test' },
      MOCK_ACCESS_TOKEN,
    );
    expect(cleared.cleared).toBe(1);

    const again = await systemHealthService.clearLoginAttempts(
      { email: 'locked.out@example.test' },
      MOCK_ACCESS_TOKEN,
    );
    expect(again.cleared).toBe(0);

    await expect(
      systemHealthService.clearLoginAttempts({}, MOCK_ACCESS_TOKEN),
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

  it('validates invite tokens and redeems them with the invite\'s own role', async () => {
    const invite = await authService.getInvite('demo-token');
    expect(invite.role).toBe('facility');
    expect(invite.status).toBe('pending');

    // Clear states for bad/used invites, plus the other demo statuses.
    await expect(authService.getInvite('missing')).rejects.toMatchObject({ status: 404 });
    await expect(authService.getInvite('expired-demo')).resolves.toMatchObject({
      status: 'expired',
    });
    await expect(authService.getInvite('used-demo')).resolves.toMatchObject({
      status: 'accepted',
    });
    await expect(authService.getInvite('revoked-demo')).resolves.toMatchObject({
      status: 'revoked',
    });

    // New-account accept: the role comes from the token, not the client.
    const created = await authService.acceptInvite({
      token: 'demo-token',
      email: invite.email,
      fullName: 'New Person (fake)',
      password: 'x',
    });
    expect(created.user.role).toBe('facility');

    // Admin invite → admin session (PRD OQ-2: no self-serve admin signup).
    const adminInvite = await authService.getInvite('admin-demo');
    expect(adminInvite.role).toBe('admin');
    const adminSession = await authService.acceptInvite({
      token: 'admin-demo',
      email: adminInvite.email,
      fullName: 'New Admin (fake)',
      password: 'x',
    });
    expect(adminSession.user.role).toBe('admin');

    // Existing user accepts with their session and no password.
    const accepted = await authService.acceptInvite(
      { token: 'demo-token', email: invite.email },
      MOCK_ACCESS_TOKEN,
    );
    expect(accepted.user.role).toBe('facility');
    await expect(
      authService.acceptInvite({ token: 'demo-token', email: invite.email }),
    ).rejects.toMatchObject({ status: 401 });

    // Email must match the invite; non-pending invites are refused.
    await expect(
      authService.acceptInvite(
        { token: 'demo-token', email: 'someone.else@example.test', password: 'x' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      authService.acceptInvite({
        token: 'expired-demo',
        email: invite.email,
        fullName: 'New Person (fake)',
        password: 'x',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('serves role-aware session timeout settings (issue #82)', async () => {
    useMockStore.setState({ activeRole: 'admin' });
    await expect(
      sessionTimeoutService.getSessionTimeoutSettings(MOCK_ACCESS_TOKEN),
    ).resolves.toEqual({ idleTimeoutMinutes: 10, warningSeconds: 60 });

    useMockStore.setState({ activeRole: 'patient' });
    await expect(
      sessionTimeoutService.getSessionTimeoutSettings(MOCK_ACCESS_TOKEN),
    ).resolves.toEqual({ idleTimeoutMinutes: 30, warningSeconds: 60 });
  });
});

describe('dependents', () => {
  it('lists seeded dependents and adds a new one', async () => {
    const seeded = await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(seeded).toHaveLength(2);

    await dependentsService.addDependent(
      { fullName: 'New Fake Dependent', dateOfBirth: '2012-01-01' },
      MOCK_ACCESS_TOKEN,
    );
    const after = await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(after).toHaveLength(3);
  });

  it("rejects create fields docforum-core doesn't accept", async () => {
    const response = await fetch('http://localhost:4000/patients/me/dependents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Too Much (fake)',
        dateOfBirth: '2012-01-01',
        relationship: 'parent',
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('adds a 17-year-old dependent', async () => {
    const created = await dependentsService.addDependent(
      { fullName: 'Seventeen (fake)', dateOfBirth: dateYearsAgo(17) },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.fullName).toBe('Seventeen (fake)');
  });

  it('rejects a dependent at the age of majority', async () => {
    const error = await dependentsService
      .addDependent(
        { fullName: 'Eighteen (fake)', dateOfBirth: dateYearsAgo(18) },
        MOCK_ACCESS_TOKEN,
      )
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).body).toMatchObject({ code: 'DEPENDENT_NOT_A_MINOR' });
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
  it('requests, polls and downloads a data export through the real paths', async () => {
    const requested = await accountService.requestDataExport(MOCK_ACCESS_TOKEN);
    expect(requested.status).toBe('ready');
    expect(requested.id).toMatch(/^exp-mock-/);

    const current = await accountService.getDataExportStatus(requested.id, MOCK_ACCESS_TOKEN);
    expect(current.id).toBe(requested.id);

    const blob = await accountService.downloadDataExport(requested.id, MOCK_ACCESS_TOKEN);
    const text = await blob.text();
    expect(text).toContain('FAKE DATA EXPORT');
  });

  it('returns an existing pending export instead of queuing a second one', async () => {
    const requested = await accountService.requestDataExport(MOCK_ACCESS_TOKEN);
    db.dataExport = { ...requested, status: 'processing', generatedAt: null };

    const again = await accountService.requestDataExport(MOCK_ACCESS_TOKEN);
    expect(again.id).toBe(requested.id);
    expect(again.status).toBe('processing');
  });

  it('returns 409 EXPORT_NOT_READY while the bundle is still generating', async () => {
    const requested = await accountService.requestDataExport(MOCK_ACCESS_TOKEN);
    db.dataExport = { ...requested, status: 'processing', generatedAt: null };

    await expect(accountService.downloadDataExport(requested.id, MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 409,
      code: 'EXPORT_NOT_READY',
    });
  });

  it('returns 410 EXPORT_EXPIRED once the export has expired', async () => {
    const requested = await accountService.requestDataExport(MOCK_ACCESS_TOKEN);
    db.dataExport = { ...requested, status: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString() };

    await expect(accountService.downloadDataExport(requested.id, MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 410,
      code: 'EXPORT_EXPIRED',
    });
  });

  it('returns 404 for an export id that is not the current one', async () => {
    await accountService.requestDataExport(MOCK_ACCESS_TOKEN);

    await expect(
      accountService.getDataExportStatus('someone-elses-export', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('deletes the account against DELETE /patients/me with a 204 response', async () => {
    await expect(accountService.deleteAccount('pw', MOCK_ACCESS_TOKEN)).resolves.toBeUndefined();
  });

  it('surfaces a wrong password as PASSWORD_CONFIRMATION_FAILED', async () => {
    await expect(accountService.deleteAccount('wrong-password', MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 403,
      code: 'PASSWORD_CONFIRMATION_FAILED',
    });
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

describe('order issuance (issue #267)', () => {
  const medication = {
    drugName: 'Amoxicillin (fake)',
    dosage: '500 mg',
    frequency: 'every 8 hours',
    duration: '5 days',
  };

  it('closes a consultation then issues a multi-item prescription', async () => {
    const consultation = await consultationService.createConsultation(
      { appointmentId: 'apt-demo-1', outcome: 'resolved', notes: 'Fake notes.' },
      MOCK_ACCESS_TOKEN,
    );
    expect(consultation.appointmentId).toBe('apt-demo-1');

    const issued = await prescriptionsService.issuePrescription(
      consultation.id,
      {
        facilityProfileId: FACILITY_ID,
        items: [medication, { ...medication, drugName: 'Ibuprofen (fake)' }],
        amountStroops: '25000000',
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(issued.items).toHaveLength(2);
    expect(issued.amountStroops).toBe('25000000');
    expect(issued.paymentIntent.orderType).toBe('prescription');
    expect(issued.paymentIntent.status).toBe('created');

    // One consultation per appointment, enforced by core.
    await expect(
      consultationService.createConsultation(
        { appointmentId: 'apt-demo-1', outcome: 'resolved' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('prices a lab order from the facility catalog and defaults urgency to routine', async () => {
    const labs = await facilityService.listEligibleFacilities('lab', MOCK_ACCESS_TOKEN);
    expect(labs.map((lab) => lab.id)).toEqual(['fac-demo-lab']);

    const consultation = await consultationService.createConsultation(
      { appointmentId: 'apt-demo-2', outcome: 'follow_up_needed' },
      MOCK_ACCESS_TOKEN,
    );
    const labOrder = await prescriptionsService.issueLabOrder(
      consultation.id,
      {
        facilityProfileId: 'fac-demo-lab',
        testType: 'Full blood count',
        catalogItemCode: 'cbc-panel',
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(labOrder.amountStroops).toBe('25000000');
    expect(labOrder.urgency).toBe('routine');
    expect(labOrder.paymentIntent.orderType).toBe('lab_order');
  });

  it('rejects orders when the doctor profile is not verified', async () => {
    const consultation = await consultationService.createConsultation(
      { appointmentId: 'apt-demo-1', outcome: 'resolved' },
      MOCK_ACCESS_TOKEN,
    );
    db.doctorProfile = { ...db.doctorProfile!, verificationStatus: 'pending' };

    await expect(
      prescriptionsService.issuePrescription(
        consultation.id,
        { facilityProfileId: FACILITY_ID, items: [medication], amountStroops: '10000000' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('enforces exactly one price and a known catalog code', async () => {
    const consultation = await consultationService.createConsultation(
      { appointmentId: 'apt-demo-3', outcome: 'resolved' },
      MOCK_ACCESS_TOKEN,
    );

    await expect(
      prescriptionsService.issuePrescription(
        consultation.id,
        {
          facilityProfileId: FACILITY_ID,
          items: [medication],
          amountStroops: '10000000',
          catalogItemCode: 'amox-500-cap',
        },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      prescriptionsService.issuePrescription(
        consultation.id,
        {
          facilityProfileId: FACILITY_ID,
          items: [medication],
          catalogItemCode: 'not-in-the-price-list',
        },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 422 });
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

  it('marks a scheduled appointment no-show, then 409s further changes', async () => {
    const updated = await queueService.updateAppointmentStatus(
      'apt-demo-4',
      'no_show',
      MOCK_ACCESS_TOKEN,
    );
    expect(updated.status).toBe('no_show');
    expect(updated.referral?.priorNoShows).toBe(1);

    await expect(
      queueService.updateAppointmentStatus('apt-demo-4', 'cancelled', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });

    // A visit that already started is no longer scheduled either.
    await expect(
      queueService.updateAppointmentStatus('apt-demo-2', 'cancelled', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an unknown status with 400', async () => {
    await expect(
      queueService.updateAppointmentStatus(
        'apt-demo-4',
        'postponed' as queueService.AppointmentStatusUpdate,
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });
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

describe('notifications', () => {
  it('pages newest first, reports the total unread count, and marks read', async () => {
    // Ask for the same page size the dev-mock handler defaults to, so the
    // second request genuinely exercises the cursor.
    const first = await notificationsService.listNotifications(
      { limit: 4 },
      MOCK_ACCESS_TOKEN,
    );
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).toBe('4');
    expect(first.unreadCount).toBe(4);

    const createdAt = first.items.map((item) => Date.parse(item.createdAt));
    expect(createdAt).toEqual([...createdAt].sort((a, b) => b - a));

    const second = await notificationsService.listNotifications(
      { cursor: first.nextCursor, limit: 4 },
      MOCK_ACCESS_TOKEN,
    );
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();

    const marked = await notificationsService.markNotificationRead(
      first.items[0].id,
      MOCK_ACCESS_TOKEN,
    );
    expect(marked.readAt).toBeTruthy();

    const after = await notificationsService.listNotifications({}, MOCK_ACCESS_TOKEN);
    expect(after.unreadCount).toBe(3);

    await expect(
      notificationsService.markNotificationRead('ntf-missing', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('marks everything read in one call', async () => {
    const result = await notificationsService.markAllNotificationsRead(MOCK_ACCESS_TOKEN);
    expect(result.unreadCount).toBe(0);
    expect(result.updated).toBe(4);

    const after = await notificationsService.listNotifications({}, MOCK_ACCESS_TOKEN);
    expect(after.items.every((item) => item.readAt !== null)).toBe(true);
  });

  it('issues a single-use stream ticket without exposing the access token', async () => {
    const ticket = await notificationsService.getNotificationStreamTicket(MOCK_ACCESS_TOKEN);
    expect(ticket.streamPath).toMatch(/^\/notifications\/stream\?ticket=/);
    expect(ticket.streamPath).not.toContain(MOCK_ACCESS_TOKEN);
    expect(Date.parse(ticket.expiresAt)).toBeGreaterThan(Date.now());
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
    expect(nearby[0].id).toBe('fac-main');
    expect(nearby[0].distanceKm).toBeLessThan(0.1);
  });

  it('returns each facility’s price in force for a catalog item, price on request otherwise', async () => {
    const eligible = await facilityService.getEligibleFacilities(
      'MED-AMOX-500',
      {},
      MOCK_ACCESS_TOKEN,
    );
    expect(eligible).toHaveLength(3);

    const priced = eligible.find((facility) => facility.id === 'fac-main');
    expect(priced?.price?.amountStroops).toBe('275000000');
    expect(priced?.priceOnRequest).toBe(false);

    const lab = eligible.find((facility) => facility.id === 'fac-demo-lab');
    expect(lab?.price).toBeNull();
    expect(lab?.priceOnRequest).toBe(true);
  });

  it('filters the free-text area query client-side, since core has no `query` param', async () => {
    const matches = await facilityService.getFacilities({ query: 'example' }, MOCK_ACCESS_TOKEN);
    expect(matches.map((f) => f.id)).toEqual(['fac-demo-pharmacy-2']);
  });

  it('rejects a missing type and radiusKm without near, like docforum-core', async () => {
    await expect(
      apiFetch('/facilities/eligible', { accessToken: MOCK_ACCESS_TOKEN }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      apiFetch('/facilities/eligible?type=lab&radiusKm=5', { accessToken: MOCK_ACCESS_TOKEN }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepts near=lat,lng with a radius and lists unknown distances last', async () => {
    const nearby = await apiFetch<{ id: string; distanceKm: number | null }[]>(
      '/facilities/eligible?type=pharmacy&near=6.5244,3.3792&radiusKm=5',
      { accessToken: MOCK_ACCESS_TOKEN },
    );
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.every((f) => f.distanceKm !== null && f.distanceKm <= 5)).toBe(true);

    const withoutLocation = await facilityService.getFacilities({}, MOCK_ACCESS_TOKEN);
    expect(withoutLocation.every((f) => f.distanceKm == null)).toBe(true);
  });
});

describe('facility performance insights', () => {
  it('returns aggregate-only insights and honours the date range', async () => {
    const insights = await insightsService.getFacilityPerformanceInsights(
      MOCK_ACCESS_TOKEN,
      FACILITY_ID,
      { preset: '30d' },
    );
    expect(insights.facilityId).toBe(FACILITY_ID);
    expect(insights.range.preset).toBe('30d');
    expect(insights.turnaround.fulfilledCount).toBeGreaterThan(0);
    expect(insights.volumeByDay.length).toBe(7);
    expect(insights.rejectionReasons.length).toBeGreaterThan(0);
    expect(insights.disputes.totalOrders).toBeGreaterThan(0);

    const custom = await insightsService.getFacilityPerformanceInsights(
      MOCK_ACCESS_TOKEN,
      FACILITY_ID,
      { preset: 'custom', startDate: '2026-10-01', endDate: '2026-10-07' },
    );
    expect(custom.range).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-07' });
  });

  it('never leaks patient-level identifiers in the aggregate payload', async () => {
    const insights = await insightsService.getFacilityPerformanceInsights(
      MOCK_ACCESS_TOKEN,
      FACILITY_ID,
    );
    const serialised = JSON.stringify(insights).toLowerCase();
    expect(serialised).not.toContain('patientname');
    expect(serialised).not.toContain('patientprofileid');
    expect(serialised).not.toContain('ord-demo');
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

  it('updates fulfillment records and dispenses items with attribution', async () => {
    const queue = await facilityTeamService.getFulfillmentQueue(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(queue).toHaveLength(5);

    const moved = await facilityTeamService.updateFulfillmentRecord(
      'ful-req-demo-lab-1',
      'in_progress',
      MOCK_ACCESS_TOKEN,
    );
    expect(moved.status).toBe('in_progress');

    const dispensed = await fulfillmentService.dispenseFulfillmentItem(
      'ful-req-demo-rx-1',
      'fit-demo-rx1-vit',
      { quantity: 10 },
      MOCK_ACCESS_TOKEN,
    );
    expect(dispensed.record.status).toBe('partially_fulfilled');
    expect(dispensed.orderStatus).toBe('partially_fulfilled');

    const after = await facilityTeamService.getFulfillmentQueue(FACILITY_ID, MOCK_ACCESS_TOKEN);
    const item = after.find((entry) => entry.id === 'fuq-demo-5');
    expect(item?.status).toBe('fulfilled');
    expect(item?.attribution?.performedByRole).toBe('owner');
    expect(item?.attribution?.action).toBe('dispensed');

    // One-shot item: replaying the PATCH is a 409, never a second dispense.
    await expect(
      fulfillmentService.dispenseFulfillmentItem(
        'ful-req-demo-rx-1',
        'fit-demo-rx1-vit',
        { quantity: 10 },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('facility fulfillment queue', () => {
  it('moves records in progress, refuses closed records, and attaches lab results', async () => {
    const moved = await fulfillmentService.updateFulfillmentRecord(
      'ful-req-demo-lab-1',
      'in_progress',
      MOCK_ACCESS_TOKEN,
    );
    expect(moved.status).toBe('in_progress');

    await expect(
      fulfillmentService.updateFulfillmentRecord(
        'ful-req-demo-rx-2',
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

describe('integrations (API keys & webhooks)', () => {
  it('creates an API key with a one-time secret not returned by list', async () => {
    const keys = await integrationsService.listApiKeys(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(keys).toHaveLength(2);

    const created = await integrationsService.createApiKey(
      FACILITY_ID,
      { name: 'Test key (fake)', scopes: ['orders.read'] },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.secret).toMatch(/^df_live_/);
    expect(created.name).toBe('Test key (fake)');

    const after = await integrationsService.listApiKeys(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(after).toHaveLength(3);
    expect(after.some((k) => 'secret' in k)).toBe(false);
  });

  it('revokes an API key and keeps it in the list as revoked', async () => {
    const revoked = await integrationsService.revokeApiKey(
      FACILITY_ID,
      'key-demo-1',
      MOCK_ACCESS_TOKEN,
    );
    expect(revoked.success).toBe(true);

    const keys = await integrationsService.listApiKeys(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(keys.find((k) => k.id === 'key-demo-1')?.revokedAt).not.toBeNull();
  });

  it('creates a webhook endpoint with a one-time signing secret', async () => {
    const created = await integrationsService.createWebhookEndpoint(
      FACILITY_ID,
      {
        url: 'https://new.example.test/webhook',
        events: ['order.created', 'order.fulfilled'],
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.signingSecret).toMatch(/^whsec_/);

    const endpoints = await integrationsService.listWebhookEndpoints(
      FACILITY_ID,
      MOCK_ACCESS_TOKEN,
    );
    expect(endpoints.some((e) => 'signingSecret' in e)).toBe(false);
    expect(endpoints.find((e) => e.id === created.id)?.url).toBe(
      'https://new.example.test/webhook',
    );
  });

  it('sends a test delivery and redelivers a failed one', async () => {
    const delivery = await integrationsService.sendTestDelivery(
      FACILITY_ID,
      'whk-demo-1',
      MOCK_ACCESS_TOKEN,
    );
    expect(delivery.status).toBe('success');

    const deliveries = await integrationsService.listWebhookDeliveries(
      FACILITY_ID,
      'whk-demo-1',
      MOCK_ACCESS_TOKEN,
    );
    expect(deliveries.some((d) => d.status === 'failed')).toBe(true);

    const redelivered = await integrationsService.redeliverWebhook(
      FACILITY_ID,
      'whk-demo-1',
      'whd-demo-2',
      MOCK_ACCESS_TOKEN,
    );
    expect(redelivered.status).toBe('success');
  });

  it('deletes an endpoint and its deliveries', async () => {
    const result = await integrationsService.deleteWebhookEndpoint(
      FACILITY_ID,
      'whk-demo-1',
      MOCK_ACCESS_TOKEN,
    );
    expect(result.success).toBe(true);
    await expect(
      integrationsService.listWebhookDeliveries(FACILITY_ID, 'whk-demo-1', MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);
  });
});

describe('facility settings and prices', () => {
  it('loads and updates location, contact and opening hours', async () => {
    const settings = await facilitySettingsService.getFacilitySettings(
      FACILITY_ID,
      MOCK_ACCESS_TOKEN,
    );
    expect(settings.facilityId).toBe(FACILITY_ID);
    expect(settings.openingHours).toHaveLength(7);

    const updated = await facilitySettingsService.updateFacilitySettings(
      FACILITY_ID,
      {
        address: '9 Updated Fixture Road',
        city: 'Sampleton',
        latitude: 6.53,
        longitude: 3.38,
        phone: '+000 000 0099',
        email: null,
        openingHours: settings.openingHours,
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(updated.address).toBe('9 Updated Fixture Road');
    expect(updated.latitude).toBe(6.53);
  });

  it('rejects invalid coordinates and missing required settings fields', async () => {
    const settings = await facilitySettingsService.getFacilitySettings(
      FACILITY_ID,
      MOCK_ACCESS_TOKEN,
    );
    const validInput = {
      address: settings.address,
      city: settings.city,
      latitude: 6.5,
      longitude: 3.3,
      phone: settings.phone,
      email: null,
      openingHours: settings.openingHours,
    };

    await expect(
      facilitySettingsService.updateFacilitySettings(
        FACILITY_ID,
        { ...validInput, latitude: 200 },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      facilitySettingsService.updateFacilitySettings(
        FACILITY_ID,
        { ...validInput, address: '   ' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('searches the catalog by name or code', async () => {
    const byName = await facilitySettingsService.searchCatalogItems('amoxicillin', MOCK_ACCESS_TOKEN);
    expect(byName.map((item) => item.code)).toEqual(['MED-AMOX-500']);

    const byCode = await facilitySettingsService.searchCatalogItems('LAB-', MOCK_ACCESS_TOKEN);
    expect(byCode).toHaveLength(2);

    const all = await facilitySettingsService.searchCatalogItems('', MOCK_ACCESS_TOKEN);
    expect(all).toHaveLength(5);
  });

  it('returns version history and appends a new price version', async () => {
    const before = await facilitySettingsService.listFacilityPrices(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(before).toHaveLength(6);

    const created = await facilitySettingsService.createFacilityPrice(
      FACILITY_ID,
      {
        catalogItemCode: 'MED-AMOX-500',
        asset: 'XLM',
        amountStroops: '300000000',
        effectiveFrom: '2026-12-01T09:00:00.000Z',
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(created.amountStroops).toBe('300000000');
    expect(created.catalogItemName).toContain('Amoxicillin');

    const after = await facilitySettingsService.listFacilityPrices(FACILITY_ID, MOCK_ACCESS_TOKEN);
    expect(after).toHaveLength(7);
  });

  it('rejects non-stroop amounts and unknown catalog items', async () => {
    await expect(
      facilitySettingsService.createFacilityPrice(
        FACILITY_ID,
        {
          catalogItemCode: 'MED-AMOX-500',
          asset: 'XLM',
          amountStroops: '1.5',
          effectiveFrom: '2026-12-01T09:00:00.000Z',
        },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      facilitySettingsService.createFacilityPrice(
        FACILITY_ID,
        {
          catalogItemCode: 'NOT-IN-CATALOG',
          asset: 'XLM',
          amountStroops: '100',
          effectiveFrom: '2026-12-01T09:00:00.000Z',
        },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('facility payout ledger', () => {
  it('filters and paginates server-side and returns lifecycle totals', async () => {
    const page = await paymentsService.getFacilityPayoutLedger(MOCK_ACCESS_TOKEN, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeTruthy();
    expect(page.items[0]).toMatchObject({
      orderType: expect.any(String),
      status: expect.any(String),
      amount: expect.any(String),
      assetCode: expect.any(String),
    });
    expect(page.totals.length).toBeGreaterThan(0);

    const escrowed = await paymentsService.getFacilityPayoutLedger(MOCK_ACCESS_TOKEN, {
      status: 'escrowed',
    });
    expect(escrowed.items.every((item) => item.status === 'escrowed')).toBe(true);

    await expect(
      paymentsService.getFacilityPayoutLedger(MOCK_ACCESS_TOKEN, { cursor: 'not-a-cursor' }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_CURSOR' });

    // The service never sends `facilityId`; a raw request that does is
    // rejected by the strict query shape.
    await expect(
      apiFetch('/payments/facility/ledger?facilityId=someone-else', {
        accessToken: MOCK_ACCESS_TOKEN,
      }),
    ).rejects.toMatchObject({ status: 400 });
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

  it('lists patient payment history with filtering by status and date range', async () => {
    const all = await paymentHistoryService.listPaymentHistory(undefined, MOCK_ACCESS_TOKEN);
    expect(all.intents.length).toBeGreaterThan(0);

    const escrowedOnly = await paymentHistoryService.listPaymentHistory(
      { status: 'escrowed' },
      MOCK_ACCESS_TOKEN,
    );
    expect(escrowedOnly.intents.every((i) => i.status === 'escrowed')).toBe(true);

    const first = all.intents[0];
    const detail = await paymentHistoryService.getPaymentHistoryEntry(first.id, MOCK_ACCESS_TOKEN);
    expect(detail.id).toBe(first.id);
    expect(detail.facilityName).toBe('Bello Lab');
  });
});

describe('doctor & symptom search', () => {
  it('autocomplete-suggests controlled-vocabulary symptoms', async () => {
    const matches = await searchService.searchSymptoms('chest', MOCK_ACCESS_TOKEN);
    expect(matches).toEqual([{ slug: 'chest-pain', term: 'Chest pain' }]);

    // Case-insensitive substring match, not just a prefix.
    const shouted = await searchService.searchSymptoms('RASH', MOCK_ACCESS_TOKEN);
    expect(shouted.map((s) => s.slug)).toContain('rash');

    // Honours the requested limit.
    const limited = await searchService.searchSymptoms('a', MOCK_ACCESS_TOKEN);
    const capped = await fetch(
      `http://localhost:4000/symptoms?q=a&limit=2`,
    ).then((r) => r.json() as Promise<Array<{ slug: string }>>);
    expect(limited.length).toBeGreaterThan(capped.length);
    expect(capped).toHaveLength(2);

    await expect(searchService.searchSymptoms('zzz', MOCK_ACCESS_TOKEN)).resolves.toEqual([]);
  });

  it('maps a symptom to its specialties and 404s on unknown slugs', async () => {
    const mapping = await searchService.getSymptomMapping('rash', MOCK_ACCESS_TOKEN);
    expect(mapping.term).toBe('Rash');
    expect(mapping.specialties.map((s) => s.slug)).toEqual(['dermatology', 'allergy-immunology']);

    await expect(
      searchService.getSymptomMapping('not-a-symptom', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('searches doctors by specialty (OR) and availability', async () => {
    const derm = await searchService.searchDoctors({ specialtyIds: ['spc-derm'] }, MOCK_ACCESS_TOKEN);
    expect(derm.map((d) => d.id)).toEqual(['doc-demo-derm-1', 'doc-demo-derm-2']);

    // "Chest pain" maps to Cardiology + General practice — doctors in
    // either specialty come back, soonest available first.
    const chestPain = await searchService.searchDoctors(
      { specialtyIds: ['spc-cardio', 'spc-gp'] },
      MOCK_ACCESS_TOKEN,
    );
    expect(chestPain.map((d) => d.id)).toEqual([
      'doc-demo-cardio-1', // +8h
      'doc-demo-gp-1', // +26h
      'doc-demo-cardio-2', // +10d
    ]);

    const today = await searchService.searchDoctors(
      { specialtyIds: ['spc-cardio', 'spc-gp'], availability: 'today' },
      MOCK_ACCESS_TOKEN,
    );
    expect(today.map((d) => d.id)).toEqual(['doc-demo-cardio-1']);

    const week = await searchService.searchDoctors(
      { specialtyIds: ['spc-cardio', 'spc-gp'], availability: 'week' },
      MOCK_ACCESS_TOKEN,
    );
    expect(week.map((d) => d.id)).toEqual(['doc-demo-cardio-1', 'doc-demo-gp-1']);

    // Unbookable doctors drop out of every availability window.
    const dermToday = await searchService.searchDoctors(
      { specialtyIds: ['spc-derm'], availability: 'today' },
      MOCK_ACCESS_TOKEN,
    );
    expect(dermToday.map((d) => d.id)).toEqual(['doc-demo-derm-1']);

    // "Fever" maps to General practice + Paediatrics; nobody in either has
    // a slot inside the "today" window, so the list is genuinely empty.
    const feverToday = await searchService.searchDoctors(
      { specialtyIds: ['spc-gp', 'spc-peds'], availability: 'today' },
      MOCK_ACCESS_TOKEN,
    );
    expect(feverToday).toEqual([]);

    await expect(
      searchService.searchDoctors({ specialtyIds: ['spc-none'] }, MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);
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

describe('feature flags', () => {
  it('returns the mock defaults for the signed-in user', async () => {
    const evaluated = await myFlagsService.getMyFlags(MOCK_ACCESS_TOKEN);
    expect(evaluated.flags.notification_preferences).toBe(true);
    expect(evaluated.flags.realtime_updates).toBe(false);
  });

  it('lets the dev panel override a flag without touching the others', async () => {
    useMockStore.setState({ flagOverrides: { realtime_updates: true } });
    const evaluated = await myFlagsService.getMyFlags(MOCK_ACCESS_TOKEN);
    expect(evaluated.flags.realtime_updates).toBe(true);
    expect(evaluated.flags.notification_preferences).toBe(true);
  });
});

describe('notification preferences', () => {
  it('returns role-appropriate defaults with locked safety-critical rows', async () => {
    const preferences = await notificationPreferencesService.getNotificationPreferences(MOCK_ACCESS_TOKEN);
    const critical = preferences.preferences.filter((pref) => pref.type === 'critical_lab_result');
    expect(critical).toHaveLength(3);
    expect(critical.every((pref) => pref.locked && pref.enabled)).toBe(true);

    useMockStore.setState({ activeRole: 'facility' });
    const facility = await notificationPreferencesService.getNotificationPreferences(MOCK_ACCESS_TOKEN);
    const facilityOrders = facility.preferences.find(
      (pref) => pref.type === 'order_updates' && pref.channel === 'email',
    );
    expect(facilityOrders?.enabled).toBe(true);
  });

  it('saves a toggle and quiet hours, and refuses to disable a locked row', async () => {
    const updated = await notificationPreferencesService.updateNotificationPreferences(
      { preferences: [{ type: 'appointment_reminders', channel: 'email', enabled: false }] },
      MOCK_ACCESS_TOKEN,
    );
    expect(
      updated.preferences.find(
        (pref) => pref.type === 'appointment_reminders' && pref.channel === 'email',
      )?.enabled,
    ).toBe(false);

    const quiet = await notificationPreferencesService.updateNotificationPreferences(
      { quietHours: { enabled: true, start: '22:00', end: '07:00', timeZone: 'Europe/London' } },
      MOCK_ACCESS_TOKEN,
    );
    expect(quiet.quietHours).toEqual({
      enabled: true,
      start: '22:00',
      end: '07:00',
      timeZone: 'Europe/London',
    });

    await expect(
      notificationPreferencesService.updateNotificationPreferences(
        { preferences: [{ type: 'critical_lab_result', channel: 'email', enabled: false }] },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 422 });
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
    await expect(paymentsService.getOwnWalletLink(MOCK_ACCESS_TOKEN)).resolves.toBeNull();
    await expect(searchService.searchSymptoms('rash', MOCK_ACCESS_TOKEN)).resolves.toEqual([]);
    await expect(
      searchService.searchDoctors({ specialtyIds: ['spc-derm'] }, MOCK_ACCESS_TOKEN),
    ).resolves.toEqual([]);
  });

  it('delays responses by the configured latency', async () => {
    useMockStore.setState({ latencyMs: 200 });
    const started = Date.now();
    await dependentsService.listDependents(MOCK_ACCESS_TOKEN);
    expect(Date.now() - started).toBeGreaterThanOrEqual(180);
  });
});

describe('pay with wallet (issue #59)', () => {
  it("lists an order's intent, prepares it, and submits the signature to escrow", async () => {
    const intent = await paymentsService.getPaymentIntentForOrder('ord-demo-lab-101', MOCK_ACCESS_TOKEN);
    expect(intent).not.toBeNull();
    expect(intent!.status).toBe('created');

    const prepared = await paymentsService.preparePaymentIntent(intent!.id, MOCK_ACCESS_TOKEN);
    expect(prepared.intentId).toBe(intent!.id);
    expect(prepared.xdr).toContain('AAAA');
    expect(prepared.status).toBe('awaiting_signature');
    expect(Date.parse(prepared.expiresAt)).toBeGreaterThan(Date.now());

    const submitted = await paymentsService.submitPaymentIntent(intent!.id, 'SIGNED_XDR', MOCK_ACCESS_TOKEN);
    expect(submitted.status).toBe('escrowed');
    expect(submitted.stellarTxHash).toBeTruthy();

    // What the confirm poll reads back after submission.
    const polled = await paymentsService.getPaymentIntent(intent!.id, MOCK_ACCESS_TOKEN);
    expect(polled.status).toBe('escrowed');
  });

  it('returns no intent for an order with no payment — the panel stays hidden', async () => {
    await expect(
      paymentsService.getPaymentIntentForOrder('ord-unpriced', MOCK_ACCESS_TOKEN),
    ).resolves.toBeNull();
  });

  it('rejects a submit without a signed XDR', async () => {
    const intent = await paymentsService.getPaymentIntentForOrder('ord-demo-lab-101', MOCK_ACCESS_TOKEN);
    await expect(
      paymentsService.submitPaymentIntent(intent!.id, '', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('specialty claims (admin verification)', () => {
  it('lists pending claims oldest first and filters by specialty and age', async () => {
    const page = await verificationService.listSpecialtyClaims({}, MOCK_ACCESS_TOKEN);
    expect(page.items.map((c) => c.id)).toEqual(['dsc-demo-3', 'dsc-demo-1', 'dsc-demo-2']);
    expect(page.nextCursor).toBeNull();

    const cardio = await verificationService.listSpecialtyClaims(
      { specialtyId: 'spec-cardiology' },
      MOCK_ACCESS_TOKEN,
    );
    expect(cardio.items.map((c) => c.specialtyId)).toEqual(['spec-cardiology']);

    // The 168h fixture (dsc-demo-3, seeded 10 days old) survives; newer claims drop.
    const old = await verificationService.listSpecialtyClaims({ olderThan: '168h' }, MOCK_ACCESS_TOKEN);
    expect(old.items.map((c) => c.id)).toEqual(['dsc-demo-3']);
    const week = await verificationService.listSpecialtyClaims({ olderThan: '72h' }, MOCK_ACCESS_TOKEN);
    expect(week.items.map((c) => c.id)).toEqual(['dsc-demo-3', 'dsc-demo-1']);
  });

  it('approves a claim and leaves the pending queue', async () => {
    const page = await verificationService.listSpecialtyClaims({}, MOCK_ACCESS_TOKEN);
    const claim = page.items.find((c) => c.id === 'dsc-demo-1')!;
    const approved = await verificationService.reviewSpecialtyClaim(
      'dsc-demo-1',
      { decision: 'approve', reason: null, expectedUpdatedAt: claim.updatedAt },
      MOCK_ACCESS_TOKEN,
    );
    expect(approved.status).toBe('verified');
    expect(approved.reviewedById).toBeTruthy();

    const after = await verificationService.listSpecialtyClaims({}, MOCK_ACCESS_TOKEN);
    expect(after.items.find((c) => c.id === 'dsc-demo-1')).toBeUndefined();
  });

  it('rejects with an actionable reason, and refuses a bare rejection', async () => {
    const page = await verificationService.listSpecialtyClaims({}, MOCK_ACCESS_TOKEN);
    const neuro = page.items.find((c) => c.id === 'dsc-demo-2')!;
    const derm = page.items.find((c) => c.id === 'dsc-demo-3')!;
    const rejected = await verificationService.reviewSpecialtyClaim(
      'dsc-demo-2',
      {
        decision: 'reject',
        reason: 'Upload a neurology board certification to resubmit.',
        expectedUpdatedAt: neuro.updatedAt,
      },
      MOCK_ACCESS_TOKEN,
    );
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toContain('board certification');

    await expect(
      verificationService.reviewSpecialtyClaim(
        'dsc-demo-3',
        { decision: 'reject', reason: 'no', expectedUpdatedAt: derm.updatedAt },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('409s when the admin reviewed a stale version of the claim', async () => {
    await expect(
      verificationService.reviewSpecialtyClaim(
        'dsc-demo-1',
        { decision: 'approve', reason: null, expectedUpdatedAt: '2026-01-01T00:00:00.000Z' },
        MOCK_ACCESS_TOKEN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('serves the claim credential as bytes and 404s unknown claims', async () => {
    const blob = await verificationService.fetchClaimCredential('dsc-demo-1', MOCK_ACCESS_TOKEN);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toContain('pdf');

    await expect(verificationService.fetchClaimCredential('nope', MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
    // dsc-demo-2 deliberately has no document attached.
    await expect(verificationService.fetchClaimCredential('dsc-demo-2', MOCK_ACCESS_TOKEN)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('serves the specialty catalog for the filter dropdown', async () => {
    const specialties = await verificationService.listSpecialties(MOCK_ACCESS_TOKEN);
    expect(specialties.map((s) => s.id)).toContain('spec-cardiology');
  });
});

describe('verification queue (issue #64)', () => {
  it('lists pending doctors oldest first with document counts', async () => {
    const list = await verificationService.listVerifications({}, MOCK_ACCESS_TOKEN);
    expect(list.items.map((item) => item.doctorProfileId)).toEqual([
      'vrf-demo-1',
      'vrf-demo-2',
      'vrf-demo-3',
    ]);
    expect(list.items[0].documentCount).toBe(2);
    expect(list.items[2].documentCount).toBe(0);
    expect(list.nextCursor).toBeNull();
  });

  it('serves the detail, mints short-lived document URLs, and records decisions once', async () => {
    const detail = await verificationService.getVerification('vrf-demo-1', MOCK_ACCESS_TOKEN);
    expect(detail.profile.fullName).toContain('Dr Ada Example');
    expect(detail.documents).toHaveLength(2);

    const link = await verificationService.requestDocumentUrl('vrf-demo-1', 'doc-demo-1', MOCK_ACCESS_TOKEN);
    expect(link.url).toContain('files.example.test');
    expect(Date.parse(link.expiresAt)).toBeGreaterThan(Date.now());

    const decision = {
      status: 'rejected' as const,
      reason: 'Credentials could not be verified.',
      expectedUpdatedAt: detail.profile.updatedAt,
    };
    const decided = await verificationService.decideVerification('vrf-demo-1', decision, MOCK_ACCESS_TOKEN);
    expect(decided.verificationStatus).toBe('rejected');

    // The decided doctor leaves the pending queue.
    const list = await verificationService.listVerifications({}, MOCK_ACCESS_TOKEN);
    expect(list.items.map((item) => item.doctorProfileId)).not.toContain('vrf-demo-1');

    // The decision lands in the audit-backed history…
    const history = await auditService.listAuditEvents(
      { entityType: 'DoctorProfile', entityId: 'vrf-demo-1', limit: 50 },
      MOCK_ACCESS_TOKEN,
    );
    expect(history.items).toHaveLength(1);
    expect(history.items[0].action).toBe('doctor.verification_status_changed');
    expect(history.items[0].toState).toBe('rejected');

    // …and repeating the same decision is a no-op: no duplicate event.
    await verificationService.decideVerification('vrf-demo-1', decision, MOCK_ACCESS_TOKEN);
    const after = await auditService.listAuditEvents(
      { entityType: 'DoctorProfile', entityId: 'vrf-demo-1', limit: 50 },
      MOCK_ACCESS_TOKEN,
    );
    expect(after.items).toHaveLength(1);
  });

  it('404s an unknown doctor and an unknown document', async () => {
    await expect(
      verificationService.getVerification('vrf-nope', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      verificationService.requestDocumentUrl('vrf-demo-1', 'doc-nope', MOCK_ACCESS_TOKEN),
    ).rejects.toMatchObject({ status: 404 });
  });
});
