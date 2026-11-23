// Seed data for the admin screens (audit viewer, stuck referrals, system
// health, feature flags). Kept apart from fixtures.ts because the main seed
// file is already long; everything here is DELIBERATELY FAKE — Placeholder /
// Example / Sample personas, `example.test` emails, fake ids and hashes.
// Shapes mirror src/types/models.ts, which mirrors docforum-core's schema
// (the W6 admin shapes are still assumed contracts — see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Phase W6").
import type {
  AccessLog,
  AuditEvent,
  BackgroundJob,
  DoctorAvailability,
  FeatureFlag,
  OutboxSummary,
  ReadinessReport,
  Specialty,
  StuckReferral,
} from '../types/models';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

export const DEMO_SPECIALTIES: Record<'cardiology' | 'dermatology' | 'general', Specialty> = {
  cardiology: { id: 'spc-demo-cardiology', name: 'Cardiology (demo)', slug: 'cardiology-demo' },
  dermatology: { id: 'spc-demo-dermatology', name: 'Dermatology (demo)', slug: 'dermatology-demo' },
  general: { id: 'spc-demo-general', name: 'General practice (demo)', slug: 'general-practice-demo' },
};

const DOCTORS = {
  ava: { id: 'prf-doctor-ava', fullName: 'Dr. Ava Sample (fake)' },
  ben: { id: 'prf-doctor-ben', fullName: 'Dr. Ben Example (fake)' },
  cleo: { id: 'prf-doctor-cleo', fullName: 'Dr. Cleo Placeholder (fake)' },
  dev: { id: 'prf-doctor-dev', fullName: 'Dr. Dev Testdata (fake)' },
};

export function createAdminSeed() {
  const auditEvents: AuditEvent[] = [
    {
      id: 'aud-demo-1',
      actorUserId: 'usr-admin-demo',
      actorRole: 'admin',
      entityType: 'FeatureFlag',
      entityId: 'flg-demo-wallet',
      action: 'feature_flag.updated',
      fromState: 'off',
      toState: 'rolling_out',
      requestId: 'req-demo-1a2b',
      metadata: { rolloutPercentage: 50 },
      createdAt: ago(2 * HOUR),
    },
    {
      id: 'aud-demo-2',
      actorUserId: 'usr-facility-demo',
      actorRole: 'facility',
      entityType: 'PaymentIntent',
      entityId: 'pin-demo-3',
      action: 'payment_intent.released',
      fromState: 'escrowed',
      toState: 'released',
      requestId: 'req-demo-3c4d',
      metadata: { asset: 'XLM', amountStroops: '750000000' },
      createdAt: ago(5 * HOUR),
    },
    {
      id: 'aud-demo-3',
      actorUserId: 'usr-doctor-demo',
      actorRole: 'doctor',
      entityType: 'Appointment',
      entityId: 'apt-demo-1',
      action: 'appointment.completed',
      fromState: 'in_progress',
      toState: 'completed',
      requestId: 'req-demo-5e6f',
      metadata: null,
      createdAt: ago(1 * DAY),
    },
    {
      id: 'aud-demo-4',
      actorUserId: 'usr-admin-demo',
      actorRole: 'admin',
      entityType: 'Referral',
      entityId: 'ref-demo-2',
      action: 'referral.reassigned',
      fromState: 'pending',
      toState: 'pending',
      requestId: 'req-demo-7g8h',
      metadata: { reason: 'Target doctor marked inactive (demo)' },
      createdAt: ago(1 * DAY + 3 * HOUR),
    },
    {
      id: 'aud-demo-5',
      actorUserId: null,
      actorRole: null,
      entityType: 'FeatureFlag',
      entityId: 'flg-demo-2fa',
      action: 'feature_flag.created',
      fromState: null,
      toState: 'off',
      requestId: null,
      metadata: null,
      createdAt: ago(3 * DAY),
    },
    {
      id: 'aud-demo-6',
      actorUserId: 'usr-patient-demo',
      actorRole: 'patient',
      entityType: 'Appointment',
      entityId: 'apt-demo-3',
      action: 'appointment.booked',
      fromState: null,
      toState: 'scheduled',
      requestId: 'req-demo-9i0j',
      metadata: null,
      createdAt: ago(4 * DAY),
    },
  ];

  const accessLogs: AccessLog[] = [
    {
      id: 'acl-demo-1',
      actorUserId: 'usr-doctor-demo',
      actorRole: 'doctor',
      entityType: 'PatientProfile',
      entityId: 'prf-patient-demo',
      route: 'GET /patients/prf-patient-demo/health/allergies (demo)',
      createdAt: ago(40 * MINUTE),
    },
    {
      id: 'acl-demo-2',
      actorUserId: 'usr-facility-demo',
      actorRole: 'facility',
      entityType: 'Order',
      entityId: 'ord-demo-rx-1',
      route: 'POST /facilities/me/verify-order (demo)',
      createdAt: ago(2 * HOUR),
    },
    {
      id: 'acl-demo-3',
      actorUserId: 'usr-doctor-demo',
      actorRole: 'doctor',
      entityType: 'ConsultationNote',
      entityId: 'not-demo-unsigned',
      route: 'GET /consultation-notes/apt-demo-2 (demo)',
      createdAt: ago(6 * HOUR),
    },
    {
      id: 'acl-demo-4',
      actorUserId: 'usr-admin-demo',
      actorRole: 'admin',
      entityType: 'PaymentIntent',
      entityId: 'pin-demo-1',
      route: 'GET /payments/intents/pin-demo-1 (demo)',
      createdAt: ago(1 * DAY),
    },
  ];

  const baseReferral = {
    sourceConsultationId: 'not-demo-unsigned',
    resultingAppointmentId: null,
    updatedAt: ago(1 * DAY),
  };

  const stuckReferrals: StuckReferral[] = [
    {
      ...baseReferral,
      id: 'ref-demo-1',
      referringDoctorId: DOCTORS.ava.id,
      targetSpecialtyId: DEMO_SPECIALTIES.cardiology.id,
      targetDoctorId: null,
      parentReferralId: null,
      status: 'pending',
      createdAt: ago(4 * DAY),
      stuckReason: 'no_doctor',
      targetSpecialty: DEMO_SPECIALTIES.cardiology,
      referringDoctor: DOCTORS.ava,
      targetDoctor: null,
      chain: null,
    },
    {
      ...baseReferral,
      id: 'ref-demo-2',
      referringDoctorId: DOCTORS.ava.id,
      targetSpecialtyId: DEMO_SPECIALTIES.dermatology.id,
      targetDoctorId: DOCTORS.ben.id,
      parentReferralId: null,
      status: 'pending',
      createdAt: ago(5 * DAY),
      stuckReason: 'doctor_inactive',
      targetSpecialty: DEMO_SPECIALTIES.dermatology,
      referringDoctor: DOCTORS.ava,
      targetDoctor: DOCTORS.ben,
      chain: null,
    },
    {
      ...baseReferral,
      id: 'ref-demo-3',
      referringDoctorId: DOCTORS.cleo.id,
      targetSpecialtyId: DEMO_SPECIALTIES.general.id,
      targetDoctorId: DOCTORS.dev.id,
      parentReferralId: 'ref-demo-3-parent',
      status: 'pending',
      createdAt: ago(3 * DAY),
      stuckReason: 'loop_flagged',
      targetSpecialty: DEMO_SPECIALTIES.general,
      referringDoctor: DOCTORS.cleo,
      targetDoctor: DOCTORS.dev,
      chain: [
        {
          referralId: 'ref-demo-3-parent',
          referringDoctor: DOCTORS.dev,
          targetSpecialty: DEMO_SPECIALTIES.general,
          targetDoctor: DOCTORS.cleo,
          status: 'completed',
          createdAt: ago(12 * DAY),
        },
        {
          referralId: 'ref-demo-3',
          referringDoctor: DOCTORS.cleo,
          targetSpecialty: DEMO_SPECIALTIES.general,
          targetDoctor: DOCTORS.dev,
          status: 'pending',
          createdAt: ago(3 * DAY),
        },
      ],
    },
  ];

  const doctorAvailability: DoctorAvailability[] = [
    {
      ...DOCTORS.cleo,
      verificationStatus: 'verified',
      specialties: [DEMO_SPECIALTIES.cardiology, DEMO_SPECIALTIES.general],
      openSlotCount: 4,
      nextAvailableAt: ahead(26 * HOUR),
    },
    {
      ...DOCTORS.dev,
      verificationStatus: 'verified',
      specialties: [DEMO_SPECIALTIES.cardiology],
      openSlotCount: 0,
      nextAvailableAt: null,
    },
    {
      ...DOCTORS.ava,
      verificationStatus: 'verified',
      specialties: [DEMO_SPECIALTIES.cardiology],
      openSlotCount: 7,
      nextAvailableAt: ahead(4 * HOUR),
    },
    {
      ...DOCTORS.ben,
      verificationStatus: 'pending',
      specialties: [DEMO_SPECIALTIES.dermatology],
      openSlotCount: 3,
      nextAvailableAt: ahead(2 * DAY),
    },
  ];

  const readiness: ReadinessReport = {
    status: 'ready',
    checkedAt: ago(5_000),
    checks: [
      { name: 'database', status: 'pass', required: true, durationMs: 11, message: 'Connected (demo fixture)' },
      { name: 'migrations', status: 'pass', required: true, durationMs: 4, message: 'No pending migrations (demo)' },
      { name: 'config', status: 'pass', required: true, durationMs: 1, message: null },
      { name: 'stellar_rpc', status: 'pass', required: false, durationMs: 182, message: 'Demo RPC reachable' },
    ],
  };

  const succeededRun = (job: string, msAgo: number, items: number) => ({
    id: `run-demo-${job}-ok`,
    job,
    status: 'succeeded' as const,
    startedAt: ago(msAgo),
    finishedAt: ago(msAgo - 4_000),
    error: null,
    itemsProcessed: items,
    trigger: 'schedule' as const,
  });

  const backgroundJobs: BackgroundJob[] = [
    {
      name: 'expire_pending_intents',
      schedule: 'every 5 minutes',
      lastRun: succeededRun('expire_pending_intents', 3 * MINUTE, 0),
      lastSuccess: succeededRun('expire_pending_intents', 3 * MINUTE, 0),
      lastFailure: null,
      nextRunAt: ahead(2 * MINUTE),
      running: false,
    },
    {
      name: 'referral_escalation',
      schedule: '0 * * * *',
      lastRun: {
        id: 'run-demo-referral-fail',
        job: 'referral_escalation',
        status: 'failed',
        startedAt: ago(2 * HOUR),
        finishedAt: ago(2 * HOUR - 9_000),
        error: 'Demo failure (fake): notification provider returned 503',
        itemsProcessed: null,
        trigger: 'schedule',
      },
      lastSuccess: succeededRun('referral_escalation', 3 * HOUR, 2),
      lastFailure: {
        id: 'run-demo-referral-fail',
        job: 'referral_escalation',
        status: 'failed',
        startedAt: ago(2 * HOUR),
        finishedAt: ago(2 * HOUR - 9_000),
        error: 'Demo failure (fake): notification provider returned 503',
        itemsProcessed: null,
        trigger: 'schedule',
      },
      nextRunAt: ahead(58 * MINUTE),
      running: false,
    },
    {
      name: 'outbox_dispatch',
      schedule: 'every 30 seconds',
      lastRun: succeededRun('outbox_dispatch', 20_000, 3),
      lastSuccess: succeededRun('outbox_dispatch', 20_000, 3),
      lastFailure: null,
      nextRunAt: ahead(10_000),
      running: false,
    },
  ];

  const outbox: OutboxSummary = {
    pendingCount: 4,
    deadLetterCount: 1,
    oldestPendingAt: ago(8 * MINUTE),
  };

  const featureFlags: FeatureFlag[] = [
    {
      id: 'flg-demo-wallet',
      key: 'wallet_payments',
      description: 'Let patients pay for orders from a linked Stellar wallet (demo flag).',
      kind: 'percentage',
      enabled: true,
      rolloutPercentage: 50,
      targeting: { roles: ['patient'], userIds: [] },
      createdAt: ago(20 * DAY),
      updatedAt: ago(2 * HOUR),
    },
    {
      id: 'flg-demo-2fa',
      key: 'two_factor_auth',
      description: 'Require a second factor at login (demo flag).',
      kind: 'boolean',
      enabled: false,
      rolloutPercentage: null,
      targeting: { roles: [], userIds: [] },
      createdAt: ago(3 * DAY),
      updatedAt: ago(3 * DAY),
    },
    {
      id: 'flg-demo-sms',
      key: 'sms_appointment_reminders',
      description: 'Send appointment reminders by SMS (demo flag).',
      kind: 'boolean',
      enabled: true,
      rolloutPercentage: null,
      targeting: { roles: ['patient'], userIds: [] },
      createdAt: ago(30 * DAY),
      updatedAt: ago(9 * DAY),
    },
  ];

  return {
    auditEvents,
    accessLogs,
    stuckReferrals,
    doctorAvailability,
    readiness,
    backgroundJobs,
    outbox,
    featureFlags,
  };
}
