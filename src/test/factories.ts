// Typed data factories for tests (issue #105).
//
// Every factory returns a complete, valid object mirroring `src/types/models.ts`
// so a test only states the fields it cares about:
//
//   const order = makePrescriptionOrder({ status: 'superseded' });
//
// Ids and timestamps come from a deterministic counter/clock, so snapshots and
// assertions stay stable. Call `resetFactorySeq()` in a `beforeEach` when a test
// asserts on generated ids.
//
// These are *test* data, not fixtures: `src/mocks/fixtures.ts` is the fake
// backend the app runs against in `npm run dev:mock`, and it must stay
// obviously fake (`example.test` emails). Factory output is only ever rendered
// inside a test process.
import type {
  Appointment,
  AuditEvent,
  BackgroundJob,
  CareThread,
  Closure,
  Dependent,
  DoctorMessageThread,
  FacilityInvite,
  FacilityMember,
  FeatureFlag,
  FulfillmentDisputeSummary,
  FulfillmentQueueItem,
  HealthEntry,
  Notification,
  NotificationPage,
  PatientOrder,
  PaymentIntent,
  QualifiedOrderFacility,
  ReadinessReport,
  Role,
  StuckReferral,
  User,
} from '../types/models';

/** Fixed "now" so relative-time rendering in tests is deterministic. */
export const TEST_NOW = '2026-10-21T12:00:00.000Z';

let seq = 0;

/** Reset generated ids — call from `beforeEach` when a test asserts on one. */
export function resetFactorySeq(): void {
  seq = 0;
}

/** Deterministic id, e.g. `apt-test-3`. */
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-test-${seq}`;
}

/** ISO timestamp `minutesAgo` minutes before `TEST_NOW`. */
export function minutesAgo(minutes: number): string {
  return new Date(Date.parse(TEST_NOW) - minutes * 60_000).toISOString();
}

// --- Session ----------------------------------------------------------------

const ROLE_EMAILS: Record<Role, string> = {
  patient: 'pat.placeholder@example.test',
  doctor: 'demo.doctor@example.test',
  facility: 'frank.facility@example.test',
  admin: 'al.admin@example.test',
};

export function makeUser(overrides: Partial<User> & { role?: Role } = {}): User {
  const role: Role = overrides.role ?? 'patient';
  return {
    id: `usr-${role}-test`,
    email: ROLE_EMAILS[role],
    role,
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt: '2026-01-05T09:00:00.000Z',
    ...overrides,
  };
}

export const makePatientUser = (overrides: Partial<User> = {}) => makeUser({ ...overrides, role: 'patient' });
export const makeDoctorUser = (overrides: Partial<User> = {}) => makeUser({ ...overrides, role: 'doctor' });
export const makeFacilityUser = (overrides: Partial<User> = {}) => makeUser({ ...overrides, role: 'facility' });
export const makeAdminUser = (overrides: Partial<User> = {}) => makeUser({ ...overrides, role: 'admin' });

// --- Appointments & queue ---------------------------------------------------

export function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: nextId('apt'),
    doctorProfileId: 'prf-doctor-test',
    patientProfileId: 'prf-patient-test',
    patientName: 'Pat Placeholder',
    startsAt: '2026-10-21T09:00:00.000Z',
    endsAt: '2026-10-21T09:30:00.000Z',
    status: 'scheduled',
    reason: 'Demo reason (fake)',
    checkInAt: null,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

// --- Patient records --------------------------------------------------------

export function makeDependent(overrides: Partial<Dependent> = {}): Dependent {
  return {
    id: nextId('dep'),
    guardianProfileId: 'prf-patient-test',
    fullName: 'Tyke Placeholder',
    dateOfBirth: '2015-04-01',
    relationship: 'parent',
    handoverStatus: 'not_eligible',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makeHealthEntry(overrides: Partial<HealthEntry> = {}): HealthEntry {
  return {
    id: nextId('hev'),
    patientProfileId: 'prf-patient-test',
    section: 'allergies',
    name: 'Peanuts (fake)',
    details: 'Test entry',
    version: 1,
    updatedAt: '2026-05-01T10:00:00.000Z',
    createdAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makeCareThread(overrides: Partial<CareThread> = {}): CareThread {
  return {
    id: nextId('cth'),
    patientProfileId: 'prf-patient-test',
    title: 'Demo consult (fake)',
    doctorName: 'Dr. Ficticia Example',
    specialty: 'General practice',
    startedAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-09T12:00:00.000Z',
    status: 'active',
    steps: [],
    ...overrides,
  };
}

// --- Orders & payments ------------------------------------------------------

export function makeQualifiedOrderFacility(
  overrides: Partial<QualifiedOrderFacility> = {},
): QualifiedOrderFacility {
  return {
    id: 'fac-test',
    userId: 'usr-facility-test',
    name: 'Demo Lab (fake)',
    type: 'lab',
    isOpen: true,
    capabilities: ['Sample collection'],
    ...overrides,
  };
}

/** A current prescription order. `overrides` may switch it to a lab order by
 * using `makeLabOrder` instead — `PatientOrder` is a discriminated union. */
export function makePrescriptionOrder(
  overrides: Partial<Extract<PatientOrder, { orderType: 'prescription' }>> = {},
): PatientOrder {
  return {
    id: nextId('rx'),
    patientProfileId: 'prf-patient-test',
    orderType: 'prescription',
    version: 1,
    supersedesId: null,
    status: 'active',
    issuedAt: '2026-10-18T08:30:00.000Z',
    issuedByDoctorName: 'Dr. Ficticia Example (fake)',
    requiresFacilitySelection: true,
    selectedFacility: null,
    medication: 'Demo Amoxicillin 500mg (fake)',
    dose: 'One capsule three times daily',
    quantity: '30 capsules',
    instructions: null,
    ...overrides,
  };
}

export function makeLabOrder(
  overrides: Partial<Extract<PatientOrder, { orderType: 'lab_order' }>> = {},
): PatientOrder {
  return {
    id: nextId('lab'),
    patientProfileId: 'prf-patient-test',
    orderType: 'lab_order',
    version: 1,
    supersedesId: null,
    status: 'active',
    issuedAt: '2026-10-18T09:00:00.000Z',
    issuedByDoctorName: 'Dr. Ficticia Example (fake)',
    requiresFacilitySelection: true,
    selectedFacility: null,
    testName: 'Demo full blood count (fake)',
    fastingRequired: true,
    instructions: null,
    ...overrides,
  };
}

export function makePaymentIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: nextId('pin'),
    orderType: 'prescription',
    orderId: 'rx-test-1',
    status: 'escrowed',
    patientProfileId: 'prf-patient-test',
    facilityId: 'fac-test',
    amountStroops: '500000000',
    escrowId: 'esc-test',
    stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000001',
    sorobanContractId: 'CD demo contract (fake)',
    createdAt: '2026-10-17T10:00:00.000Z',
    updatedAt: '2026-10-17T10:05:00.000Z',
    ...overrides,
  };
}

// --- Messaging --------------------------------------------------------------

export function makeDoctorMessageThread(
  overrides: Partial<DoctorMessageThread> = {},
): DoctorMessageThread {
  return {
    id: nextId('mth'),
    patientProfileId: 'prf-patient-test',
    patientName: 'Pat Placeholder',
    lastMessageAt: '2026-10-18T07:10:00.000Z',
    unreadCount: 0,
    lastPreview: 'Demo message (fake)',
    waitingMinutes: 30,
    closingSoon: false,
    ...overrides,
  };
}

// --- Facility ---------------------------------------------------------------

export function makeFacilityMember(overrides: Partial<FacilityMember> = {}): FacilityMember {
  return {
    id: nextId('fmb'),
    facilityId: 'fac-test',
    userId: 'usr-facility-test',
    fullName: 'Frank Facility (fake)',
    email: 'frank.facility@example.test',
    role: 'owner',
    joinedAt: '2026-01-10T09:00:00.000Z',
    ...overrides,
  };
}

export function makeFacilityInvite(overrides: Partial<FacilityInvite> = {}): FacilityInvite {
  return {
    id: nextId('inv'),
    facilityId: 'fac-test',
    email: 'new.staff@example.test',
    role: 'staff',
    invitedBy: 'usr-facility-test',
    invitedAt: '2026-10-15T09:00:00.000Z',
    expiresAt: '2026-10-22T09:00:00.000Z',
    status: 'pending',
    ...overrides,
  };
}

export function makeFulfillmentQueueItem(
  overrides: Partial<FulfillmentQueueItem> = {},
): FulfillmentQueueItem {
  return {
    id: nextId('fuq'),
    facilityId: 'fac-test',
    orderId: 'rx-test-1',
    orderType: 'prescription',
    patientName: 'Pat Placeholder',
    patientProfileId: 'prf-patient-test',
    itemName: 'Demo Amoxicillin 500mg (fake)',
    instructions: null,
    status: 'pending',
    receivedAt: '2026-10-18T07:30:00.000Z',
    attribution: null,
    ...overrides,
  };
}

// --- Admin ------------------------------------------------------------------

export function makeAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: nextId('aud'),
    actorUserId: 'usr-admin-test',
    actorRole: 'admin',
    entityType: 'Appointment',
    entityId: 'apt-test-1',
    action: 'appointment.booked',
    fromState: null,
    toState: 'scheduled',
    requestId: 'req-test-1',
    metadata: null,
    createdAt: '2026-10-18T09:00:00.000Z',
    ...overrides,
  };
}

export function makeFeatureFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: nextId('flag'),
    key: 'wallet_payments',
    description: 'Custodial wallet payments',
    kind: 'boolean',
    enabled: false,
    rolloutPercentage: null,
    targeting: { roles: [], userIds: [] },
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

export function makeClosure(overrides: Partial<Closure> = {}): Closure {
  return {
    id: nextId('clo'),
    name: 'Holiday closure (fake)',
    description: null,
    status: 'active',
    allDay: true,
    start: '2026-12-24T00:00:00.000Z',
    end: '2026-12-26T23:59:59.999Z',
    facilityId: null,
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
    ...overrides,
  };
}

export function makeDisputeSummary(
  overrides: Partial<FulfillmentDisputeSummary> = {},
): FulfillmentDisputeSummary {
  return {
    id: nextId('dsp'),
    status: 'open',
    orderId: 'rx-test-1',
    orderType: 'prescription',
    itemName: 'Demo Amoxicillin 500mg (fake)',
    patientName: 'Pat Placeholder',
    facility: { id: 'fac-test', name: 'Demo Pharmacy (fake)' },
    amountStroops: '500000000',
    asset: 'XLM',
    reason: 'not_received',
    openedAt: '2026-10-14T08:15:00.000Z',
    updatedAt: '2026-10-15T10:20:00.000Z',
    ...overrides,
  };
}

export function makeStuckReferral(overrides: Partial<StuckReferral> = {}): StuckReferral {
  return {
    id: nextId('ref'),
    sourceConsultationId: 'con-test-1',
    referringDoctorId: 'prf-doctor-test',
    targetSpecialtyId: 'spec-cardiology',
    targetDoctorId: null,
    parentReferralId: null,
    status: 'pending',
    resultingAppointmentId: null,
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    stuckReason: 'no_doctor',
    targetSpecialty: { id: 'spec-cardiology', name: 'Cardiology', slug: 'cardiology' },
    referringDoctor: { id: 'prf-doctor-test', fullName: 'Dr. Ficticia Example' },
    targetDoctor: null,
    chain: null,
    ...overrides,
  };
}

export function makeBackgroundJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    name: 'expire_orders',
    schedule: 'every 5 minutes',
    lastRun: null,
    lastSuccess: null,
    lastFailure: null,
    nextRunAt: '2026-10-21T12:05:00.000Z',
    running: false,
    ...overrides,
  };
}

export function makeReadinessReport(overrides: Partial<ReadinessReport> = {}): ReadinessReport {
  return {
    status: 'ready',
    checkedAt: '2026-10-21T11:59:00.000Z',
    checks: [
      { name: 'database', status: 'pass', required: true, durationMs: 4, message: null },
      { name: 'stellar_rpc', status: 'pass', required: false, durationMs: 12, message: null },
    ],
    ...overrides,
  };
}

// --- Notifications (issue #107) --------------------------------------------

export function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: nextId('ntf'),
    kind: 'appointment_booked',
    title: 'Appointment booked',
    body: 'Your appointment is confirmed.',
    link: '/patient/appointments',
    readAt: null,
    createdAt: minutesAgo(30),
    ...overrides,
  };
}

export function makeNotificationPage(overrides: Partial<NotificationPage> = {}): NotificationPage {
  const items = overrides.items ?? [makeNotification()];
  return {
    items,
    nextCursor: null,
    unreadCount: items.filter((item) => item.readAt === null).length,
    ...overrides,
  };
}
