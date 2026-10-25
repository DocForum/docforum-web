// Seed fixtures for the mock API (issue #95). Everything here is
// DELIBERATELY FAKE: names use Placeholder/Example/Demo personas and all
// emails use the RFC 2606 reserved `example.test` domain so no fixture
// can ever be mistaken for a real person or address. Fixtures mirror the
// shapes in src/types/models.ts (which mirror docforum-core's schema) —
// see ARCHITECTURE_ESSENTIALS.md "Known assumptions" for which of those
// shapes are still assumed contracts.
import { defaultPreferencesForRole } from '../features/notifications/preferences';
import type {
  Appointment,
  AuditEvent,
  CareThread,
  Closure,
  ConsultationAddendum,
  ConsultationIssuedOrder,
  ConsultationNote,
  ConsultationRecord,
  ConsultationReferral,
  CredentialDocument,
  DataExport,
  Dependent,
  DoctorPracticeInsights,
  FacilityApiKey,
  FacilityInvite,
  FacilityMember,
  FacilityPerformanceInsights,
  FacilityWithDistance,
  FulfillmentDispute,
  FulfillmentQueueItem,
  HealthEntry,
  IntakeForm,
  DoctorMessageThread,
  NotificationPreferences,
  PatientOrder,
  PaymentIntent,
  QualifiedOrderFacility,
  Role,
  RunningDelay,
  SpecialtyClaim,
  User,
  VerificationStatus,
  WalletLink,
  WebhookDelivery,
  WebhookEndpoint,
} from '../types/models';

// --- Personas (one per role the dev panel can switch to) --------------------

export const MOCK_ACCESS_TOKEN = 'mock-access-token';

export const PATIENT_USER: User = {
  id: 'usr-patient-demo',
  email: 'pat.placeholder@example.test',
  role: 'patient',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
};

export const DOCTOR_USER: User = {
  id: 'usr-doctor-demo',
  email: 'demo.doctor@example.test',
  role: 'doctor',
  createdAt: '2026-01-06T09:00:00.000Z',
  updatedAt: '2026-01-06T09:00:00.000Z',
};

export const FACILITY_USER: User = {
  id: 'usr-facility-demo',
  email: 'frank.facility@example.test',
  role: 'facility',
  createdAt: '2026-01-07T09:00:00.000Z',
  updatedAt: '2026-01-07T09:00:00.000Z',
};

export const ADMIN_USER: User = {
  id: 'usr-admin-demo',
  email: 'al.admin@example.test',
  role: 'admin',
  createdAt: '2026-01-08T09:00:00.000Z',
  updatedAt: '2026-01-08T09:00:00.000Z',
};

/** Fixed ids used across fixtures so profile-scoped calls line up. */
export const PATIENT_PROFILE_ID = 'prf-patient-demo';
export const DEPENDENT_PROFILE_ID = 'prf-dependent-demo';
export const DOCTOR_PROFILE_ID = 'prf-doctor-demo';
export const FACILITY_ID = 'fac-demo-pharmacy';

// --- Seed database -----------------------------------------------------------

export interface MockDb {
  dependents: Dependent[];
  healthEntries: HealthEntry[];
  dataExport: DataExport | null;
  careThreads: CareThread[];
  appointments: Appointment[];
  intakeForms: IntakeForm[];
  runningDelay: RunningDelay;
  messageThreads: DoctorMessageThread[];
  consultationNotes: ConsultationNote[];
  consultationRecords: ConsultationRecord[];
  consultationReferrals: ConsultationReferral[];
  consultationOrders: ConsultationIssuedOrder[];
  insights: DoctorPracticeInsights;
  facilityInsights: FacilityPerformanceInsights;
  facilities: FacilityWithDistance[];
  facilityMembers: FacilityMember[];
  facilityInvites: FacilityInvite[];
  fulfillmentQueue: FulfillmentQueueItem[];
  apiKeys: FacilityApiKey[];
  webhookEndpoints: WebhookEndpoint[];
  webhookDeliveries: WebhookDelivery[];
  patientOrders: PatientOrder[];
  orderFacilities: Record<string, QualifiedOrderFacility[]>;
  walletLink: WalletLink | null;
  paymentIntents: PaymentIntent[];
  disputes: FulfillmentDispute[];
  consultationAddenda: ConsultationAddendum[]; // flattened, noteId-keyed lookups below
  verifications: MockVerification[];
  specialtyClaims: SpecialtyClaim[];
  auditEvents: AuditEvent[];
  closures: Closure[];
  notificationPreferences: Record<Role, NotificationPreferences>;
}

/** A doctor's verification application (issue #64's assumed queue/detail
 * shape) — queue rows, detail profile and credential documents in one row. */
export interface MockVerification {
  doctorProfileId: string;
  userId: string;
  fullName: string;
  email: string;
  specialties: string[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  verificationStatus: VerificationStatus;
  documents: CredentialDocument[];
}

export function createSeedDb(): MockDb {
  const dependents: Dependent[] = [
    {
      id: 'dep-demo-1',
      guardianProfileId: PATIENT_PROFILE_ID,
      fullName: 'Tyke Placeholder',
      dateOfBirth: '2015-04-01',
      relationship: 'parent',
      handoverStatus: 'invited',
      claimEmail: 'tyke.placeholder@example.test',
      claimInviteExpiresAt: '2026-10-25T09:00:00.000Z',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'dep-demo-2',
      guardianProfileId: PATIENT_PROFILE_ID,
      fullName: 'Junior Placeholder',
      dateOfBirth: '2010-07-15',
      relationship: 'guardian',
      handoverStatus: 'not_eligible',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ];

  const healthEntries: HealthEntry[] = [
    {
      id: 'hev-demo-allergy-1',
      patientProfileId: PATIENT_PROFILE_ID,
      section: 'allergies',
      name: 'Peanuts (fake)',
      details: 'Demo fixture — severe reaction, carries an auto-injector (not real).',
      version: 1,
      updatedAt: '2026-05-01T10:00:00.000Z',
      createdAt: '2026-05-01T10:00:00.000Z',
    },
    {
      id: 'hev-demo-condition-1',
      patientProfileId: PATIENT_PROFILE_ID,
      section: 'conditions',
      name: 'Sample asthma (fake)',
      details: 'Demo fixture — mild, exercise-induced.',
      version: 2,
      previousValue: 'Sample asthma (fake), mild',
      updatedAt: '2026-06-01T10:00:00.000Z',
      createdAt: '2026-06-01T10:00:00.000Z',
    },
    {
      id: 'hev-demo-medication-1',
      patientProfileId: PATIENT_PROFILE_ID,
      section: 'medications',
      name: 'Demo Vitamin D 1000 IU',
      details: 'Demo fixture — once daily.',
      version: 1,
      updatedAt: '2026-07-01T10:00:00.000Z',
      createdAt: '2026-07-01T10:00:00.000Z',
    },
  ];

  const dataExport: DataExport = {
    id: 'exp-demo-1',
    patientProfileId: PATIENT_PROFILE_ID,
    status: 'ready',
    requestedAt: '2026-10-17T09:00:00.000Z',
    readyAt: '2026-10-17T09:02:00.000Z',
    expiresAt: '2026-10-18T09:02:00.000Z',
    fileSizeBytes: 20480,
    downloadUrl: null,
    errorMessage: null,
  };

  const careThreads: CareThread[] = [
    {
      id: 'cth-demo-1',
      patientProfileId: PATIENT_PROFILE_ID,
      title: 'Demo cough consult (fake)',
      doctorName: 'Dr. Ficticia Example',
      specialty: 'General practice (demo)',
      startedAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-09T12:00:00.000Z',
      status: 'active',
      steps: [
        {
          id: 'st-demo-1',
          stepType: 'appointment',
          title: 'Appointment booked (demo)',
          description: 'Demo fixture appointment with Dr. Ficticia Example.',
          status: 'completed',
          timestamp: '2026-10-01T09:00:00.000Z',
          metadata: { doctorTimeZone: 'Europe/London' },
        },
        {
          id: 'st-demo-2',
          stepType: 'consultation',
          title: 'Consultation completed (demo)',
          description: 'Demo consultation notes recorded.',
          status: 'completed',
          timestamp: '2026-10-08T10:00:00.000Z',
        },
        {
          id: 'st-demo-3',
          stepType: 'order',
          title: 'Lab order placed (demo)',
          description: 'Fake full blood count sent to Demo Lab.',
          status: 'in_progress',
          timestamp: '2026-10-08T10:15:00.000Z',
        },
        {
          id: 'st-demo-4',
          stepType: 'payment',
          title: 'Escrow funded (demo)',
          description: 'Fake payment intent funded and held in escrow.',
          status: 'pending',
        },
      ],
    },
    {
      id: 'cth-demo-2',
      patientProfileId: PATIENT_PROFILE_ID,
      title: 'Demo vaccination visit (fake)',
      doctorName: 'Dr. Ficticia Example',
      specialty: 'General practice (demo)',
      startedAt: '2026-08-10T09:00:00.000Z',
      updatedAt: '2026-08-10T11:00:00.000Z',
      status: 'completed',
      steps: [
        {
          id: 'st-demo-5',
          stepType: 'appointment',
          title: 'Appointment completed (demo)',
          description: 'Demo fixture vaccination visit.',
          status: 'completed',
          timestamp: '2026-08-10T11:00:00.000Z',
          metadata: { doctorTimeZone: 'Europe/London' },
        },
      ],
    },
  ];

  const appointments: Appointment[] = [
    {
      id: 'apt-demo-1',
      doctorProfileId: DOCTOR_PROFILE_ID,
      patientProfileId: PATIENT_PROFILE_ID,
      patientName: 'Pat Placeholder',
      startsAt: '2026-10-18T08:00:00.000Z',
      endsAt: '2026-10-18T08:30:00.000Z',
      status: 'completed',
      reason: 'Demo follow-up (fake)',
      checkInAt: '2026-10-18T07:55:00.000Z',
      startedAt: '2026-10-18T08:05:00.000Z',
      completedAt: '2026-10-18T08:28:00.000Z',
    },
    {
      id: 'apt-demo-2',
      doctorProfileId: DOCTOR_PROFILE_ID,
      patientProfileId: 'prf-patient-2',
      patientName: 'Sam Example',
      startsAt: '2026-10-18T09:00:00.000Z',
      endsAt: '2026-10-18T09:30:00.000Z',
      status: 'in_progress',
      reason: 'Demo chest pain assessment (fake)',
      checkInAt: '2026-10-18T08:52:00.000Z',
      startedAt: '2026-10-18T09:07:00.000Z',
      completedAt: null,
    },
    {
      id: 'apt-demo-3',
      doctorProfileId: DOCTOR_PROFILE_ID,
      patientProfileId: 'prf-patient-3',
      patientName: 'Quinn Example',
      startsAt: '2026-10-18T09:30:00.000Z',
      endsAt: '2026-10-18T10:00:00.000Z',
      status: 'checked_in',
      reason: 'Demo prescription review (fake)',
      checkInAt: '2026-10-18T09:20:00.000Z',
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'apt-demo-4',
      doctorProfileId: DOCTOR_PROFILE_ID,
      patientProfileId: 'prf-patient-4',
      patientName: 'Robin Sample',
      startsAt: '2026-10-18T10:00:00.000Z',
      endsAt: '2026-10-18T10:30:00.000Z',
      status: 'scheduled',
      reason: 'Demo new concern (fake)',
      checkInAt: null,
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'apt-demo-5',
      doctorProfileId: DOCTOR_PROFILE_ID,
      patientProfileId: 'prf-patient-5',
      patientName: 'Morgan Testdata',
      startsAt: '2026-10-18T10:30:00.000Z',
      endsAt: '2026-10-18T11:00:00.000Z',
      status: 'no_show',
      reason: 'Demo no-show (fake)',
      checkInAt: null,
      startedAt: null,
      completedAt: null,
    },
  ];

  const intakeForms: IntakeForm[] = [
    {
      id: 'itk-demo-1',
      appointmentId: 'apt-demo-3',
      patientProfileId: 'prf-patient-3',
      submittedAt: '2026-10-18T09:18:00.000Z',
      chiefComplaint: 'Demo prescription review (fake)',
      symptomDuration: '2 days',
      severity: 4,
      currentMedications: ['Demo Metformin 850mg (fake)'],
      allergies: ['None recorded'],
      notes: 'Demo intake note (fake).',
    },
    {
      id: 'itk-demo-2',
      appointmentId: 'apt-demo-4',
      patientProfileId: 'prf-patient-4',
      submittedAt: '2026-10-18T09:45:00.000Z',
      chiefComplaint: 'Demo new concern (fake)',
      symptomDuration: null,
      severity: null,
      currentMedications: [],
      allergies: ['Demo penicillin allergy (fake)'],
      notes: null,
    },
  ];

  const runningDelay: RunningDelay = {
    computedDelayMin: 12,
    manualOverrideMin: null,
    effectiveDelayMin: 12,
  };

  const messageThreads: DoctorMessageThread[] = [
    {
      id: 'mth-demo-1',
      patientProfileId: PATIENT_PROFILE_ID,
      patientName: 'Pat Placeholder',
      lastMessageAt: '2026-10-18T07:10:00.000Z',
      unreadCount: 3,
      lastPreview: 'Demo message (fake): my cough got worse overnight…',
      waitingMinutes: 185,
      closingSoon: true,
    },
    {
      id: 'mth-demo-2',
      patientProfileId: 'prf-patient-2',
      patientName: 'Sam Example',
      lastMessageAt: '2026-10-18T08:45:00.000Z',
      unreadCount: 1,
      lastPreview: 'Demo message (fake): when should I take the new tablets?',
      waitingMinutes: 90,
      closingSoon: false,
    },
    {
      id: 'mth-demo-3',
      patientProfileId: 'prf-patient-3',
      patientName: 'Quinn Example',
      lastMessageAt: '2026-10-17T16:20:00.000Z',
      unreadCount: 0,
      lastPreview: 'Demo message (fake): thanks doctor!',
      waitingMinutes: null,
      closingSoon: false,
    },
    {
      id: 'mth-demo-4',
      patientProfileId: 'prf-patient-6',
      patientName: 'Casey Fixture',
      lastMessageAt: '2026-10-18T08:00:00.000Z',
      unreadCount: 2,
      lastPreview: 'Demo message (fake): pharmacy says my order is not ready…',
      waitingMinutes: 120,
      closingSoon: true,
    },
  ];

  const consultationAddenda: ConsultationAddendum[] = [
    {
      id: 'cad-demo-1',
      noteId: 'not-demo-signed',
      content: 'Demo addendum (fake): patient called to confirm dosage.',
      createdAt: '2026-10-16T12:00:00.000Z',
    },
  ];

  const consultationNotes: ConsultationNote[] = [
    {
      id: 'not-demo-unsigned',
      appointmentId: 'apt-demo-2',
      content:
        'Demo consultation note (fake). Patient reports mild symptoms. Plan: rest, fluids, review in one week. No real medical data lives in this fixture.',
      signedAt: null,
      signedBy: null,
      autoSignOffAt: '2026-10-19T09:00:00.000Z',
      addenda: [],
    },
    {
      id: 'not-demo-signed',
      appointmentId: 'apt-demo-1',
      content: 'Demo consultation note (fake), already signed off.',
      signedAt: '2026-10-18T08:35:00.000Z',
      signedBy: 'Dr. Demo Doctor (fake)',
      autoSignOffAt: null,
      addenda: consultationAddenda.filter((a) => a.noteId === 'not-demo-signed'),
    },
  ];

  const insights: DoctorPracticeInsights = {
    doctorProfileId: DOCTOR_PROFILE_ID,
    range: { preset: '30d', startDate: '2026-09-18', endDate: '2026-10-18' },
    generatedAt: '2026-10-18T06:00:00.000Z',
    utilisation: {
      weeks: [
        {
          weekLabel: 'Sep 21',
          startDate: '2026-09-21',
          endDate: '2026-09-27',
          offeredSlots: 40,
          bookedSlots: 31,
          completedSlots: 28,
          utilisationRate: 77.5,
        },
        {
          weekLabel: 'Sep 28',
          startDate: '2026-09-28',
          endDate: '2026-10-04',
          offeredSlots: 40,
          bookedSlots: 34,
          completedSlots: 30,
          utilisationRate: 85,
        },
        {
          weekLabel: 'Oct 5',
          startDate: '2026-10-05',
          endDate: '2026-10-11',
          offeredSlots: 40,
          bookedSlots: 26,
          completedSlots: 24,
          utilisationRate: 65,
        },
        {
          weekLabel: 'Oct 12',
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          offeredSlots: 40,
          bookedSlots: 33,
          completedSlots: 21,
          utilisationRate: 82.5,
        },
      ],
      overallOfferedSlots: 160,
      overallBookedSlots: 124,
      overallUtilisationRate: 77.5,
      sampleSizeWarning: false,
    },
    noShows: {
      totalScheduled: 124,
      completedVisits: 103,
      noShows: 9,
      lateCancellations: 5,
      onTimeCancellations: 7,
      noShowRate: 7.3,
      lateCancelRate: 4,
      sampleSizeWarning: false,
    },
    referrals: {
      totalSent: 14,
      totalAccepted: 10,
      totalPending: 4,
      averageAcceptanceHours: 30.5,
      medianAcceptanceHours: 22,
      breakdownUnder24h: 6,
      breakdown24to48h: 3,
      breakdownOver48h: 1,
      sampleSizeWarning: false,
    },
    messages: {
      totalThreads: 38,
      averageFirstResponseMinutes: 74,
      medianFirstResponseMinutes: 41,
      respondedWithin2hCount: 24,
      respondedWithin24hCount: 35,
      rateWithin2h: 63.2,
      sampleSizeWarning: false,
    },
  };

  const facilityInsights: FacilityPerformanceInsights = {
    facilityId: FACILITY_ID,
    range: { preset: '30d', startDate: '2026-09-18', endDate: '2026-10-18' },
    generatedAt: '2026-10-18T06:00:00.000Z',
    turnaround: {
      fulfilledCount: 68,
      medianHours: 3.5,
      p90Hours: 27.4,
      minHours: 0.4,
      maxHours: 51.2,
      within1h: 12,
      within4h: 38,
      within24h: 61,
      over24h: 7,
      sampleSizeWarning: false,
    },
    volumeByDay: [
      { date: '2026-10-12', received: 9, fulfilled: 8, rejected: 1 },
      { date: '2026-10-13', received: 11, fulfilled: 9, rejected: 2 },
      { date: '2026-10-14', received: 7, fulfilled: 7, rejected: 0 },
      { date: '2026-10-15', received: 12, fulfilled: 10, rejected: 1 },
      { date: '2026-10-16', received: 10, fulfilled: 9, rejected: 1 },
      { date: '2026-10-17', received: 8, fulfilled: 6, rejected: 2 },
      { date: '2026-10-18', received: 5, fulfilled: 4, rejected: 0 },
    ],
    rejectionReasons: [
      { code: 'out_of_stock', label: 'Out of stock', count: 4, percentage: 57.1 },
      { code: 'prescription_invalid', label: 'Prescription invalid', count: 2, percentage: 28.6 },
      { code: 'patient_unreachable', label: 'Patient unreachable', count: 1, percentage: 14.3 },
    ],
    disputes: {
      totalOrders: 68,
      disputedOrders: 3,
      disputeRate: 4.4,
      resolvedInFacilityFavour: 1,
      resolvedInPatientFavour: 1,
      openDisputes: 1,
      averageResolutionHours: 40.5,
      sampleSizeWarning: false,
    },
  };

  const facilities: FacilityWithDistance[] = [
    {
      id: FACILITY_ID,
      userId: 'usr-facility-demo',
      name: 'Demo Pharmacy (fake)',
      type: 'pharmacy',
      location: {
        address: '1 Fixture Lane',
        city: 'Sampleton',
        latitude: 6.5244,
        longitude: 3.3792,
      },
      distanceKm: null,
      isOpen: true,
      phone: '+000-000-0001 (fake)',
      rating: 4.6,
    },
    {
      id: 'fac-demo-lab',
      userId: 'usr-facility-lab',
      name: 'Demo Lab (fake)',
      type: 'lab',
      location: {
        address: '2 Fixture Lane',
        city: 'Sampleton',
        latitude: 6.5312,
        longitude: 3.3915,
      },
      distanceKm: null,
      isOpen: true,
      phone: '+000-000-0002 (fake)',
      rating: 4.2,
    },
    {
      id: 'fac-demo-pharmacy-2',
      userId: 'usr-facility-pharmacy-2',
      name: 'Example Chemist (fake)',
      type: 'pharmacy',
      location: {
        address: '3 Example Street',
        city: 'Mockford',
        latitude: 6.6,
        longitude: 3.45,
      },
      distanceKm: null,
      isOpen: false,
      phone: '+000-000-0003 (fake)',
      rating: 3.9,
    },
  ];

  const facilityMembers: FacilityMember[] = [
    {
      id: 'fmb-demo-owner',
      facilityId: FACILITY_ID,
      userId: 'usr-facility-demo',
      fullName: 'Frank Facility (fake)',
      email: 'frank.facility@example.test',
      role: 'owner',
      joinedAt: '2026-01-10T09:00:00.000Z',
      isCurrentUser: true,
    },
    {
      id: 'fmb-demo-staff',
      facilityId: FACILITY_ID,
      userId: 'usr-facility-staff',
      fullName: 'Mo Example (fake)',
      email: 'mo.example@example.test',
      role: 'staff',
      joinedAt: '2026-02-14T09:00:00.000Z',
      isCurrentUser: false,
    },
  ];

  const facilityInvites: FacilityInvite[] = [
    {
      id: 'inv-demo-1',
      facilityId: FACILITY_ID,
      email: 'new.staff@example.test',
      role: 'staff',
      invitedBy: 'usr-facility-demo',
      invitedAt: '2026-10-15T09:00:00.000Z',
      expiresAt: '2026-10-22T09:00:00.000Z',
      status: 'pending',
    },
  ];

  const fulfillmentQueue: FulfillmentQueueItem[] = [
    {
      id: 'fuq-demo-1',
      facilityId: FACILITY_ID,
      orderId: 'ord-demo-rx-1',
      orderType: 'prescription',
      patientName: 'Pat Placeholder',
      patientProfileId: PATIENT_PROFILE_ID,
      itemName: 'Demo Amoxicillin 500mg (fake)',
      instructions: 'Demo instructions (fake): one capsule three times daily for five days.',
      status: 'pending',
      receivedAt: '2026-10-18T07:30:00.000Z',
      attribution: null,
    },
    {
      id: 'fuq-demo-2',
      facilityId: FACILITY_ID,
      orderId: 'ord-demo-lab-1',
      orderType: 'lab',
      patientName: 'Sam Example',
      patientProfileId: 'prf-patient-2',
      itemName: 'Demo blood panel (fake)',
      instructions: 'Demo instructions (fake): fasting sample required.',
      status: 'pending',
      receivedAt: '2026-10-18T08:05:00.000Z',
      attribution: null,
    },
    {
      id: 'fuq-demo-3',
      facilityId: FACILITY_ID,
      orderId: 'ord-demo-rx-2',
      orderType: 'prescription',
      patientName: 'Quinn Example',
      patientProfileId: 'prf-patient-3',
      itemName: 'Demo Metformin 850mg (fake)',
      instructions: null,
      status: 'fulfilled',
      receivedAt: '2026-10-17T14:00:00.000Z',
      attribution: {
        action: 'dispensed',
        performedByUserId: 'usr-facility-staff',
        performedByName: 'Mo Example (fake)',
        performedByEmail: 'mo.example@example.test',
        performedByRole: 'staff',
        timestamp: '2026-10-17T14:40:00.000Z',
        notes: 'Demo attribution (fake).',
      },
    },
  ];

  const patientOrders: PatientOrder[] = [
    {
      id: 'ord-demo-rx-102',
      patientProfileId: PATIENT_PROFILE_ID,
      orderType: 'prescription',
      version: 2,
      supersedesId: 'ord-demo-rx-101',
      status: 'active',
      issuedAt: '2026-10-18T08:30:00.000Z',
      issuedByDoctorName: 'Dr. Ficticia Example (fake)',
      requiresFacilitySelection: true,
      selectedFacility: null,
      medication: 'Demo Amoxicillin 500mg (fake)',
      dose: 'One capsule three times daily',
      quantity: '30 capsules',
      instructions: 'Demo instructions (fake): take with food for ten days.',
    },
    {
      id: 'ord-demo-rx-101',
      patientProfileId: PATIENT_PROFILE_ID,
      orderType: 'prescription',
      version: 1,
      supersedesId: null,
      status: 'superseded',
      issuedAt: '2026-10-17T08:30:00.000Z',
      issuedByDoctorName: 'Dr. Ficticia Example (fake)',
      requiresFacilitySelection: true,
      selectedFacility: null,
      medication: 'Demo Amoxicillin 250mg (fake)',
      dose: 'One capsule three times daily',
      quantity: '30 capsules',
      instructions: 'Superseded by a corrected dose.',
    },
    {
      id: 'ord-demo-lab-101',
      patientProfileId: PATIENT_PROFILE_ID,
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
      instructions: 'Demo instructions (fake): fasting sample required.',
    },
    {
      id: 'ord-demo-rx-100',
      patientProfileId: PATIENT_PROFILE_ID,
      orderType: 'prescription',
      version: 1,
      supersedesId: null,
      status: 'completed',
      issuedAt: '2026-09-20T08:30:00.000Z',
      issuedByDoctorName: 'Dr. Ficticia Example (fake)',
      requiresFacilitySelection: true,
      selectedFacility: {
        id: FACILITY_ID,
        name: 'Demo Pharmacy (fake)',
        type: 'pharmacy',
        isOpen: true,
      },
      medication: 'Demo Vitamin D 1000 IU (fake)',
      dose: 'One tablet daily',
      quantity: '30 tablets',
      instructions: null,
    },
    {
      // Cancelled — backs the refunded payment intent below (issue #61):
      // the order fell through and the escrow came back to the patient.
      id: 'ord-demo-rx-103',
      patientProfileId: PATIENT_PROFILE_ID,
      orderType: 'prescription',
      version: 1,
      supersedesId: null,
      status: 'cancelled',
      issuedAt: '2026-10-14T11:00:00.000Z',
      issuedByDoctorName: 'Dr. Ficticia Example (fake)',
      requiresFacilitySelection: false,
      selectedFacility: {
        id: FACILITY_ID,
        name: 'Demo Pharmacy (fake)',
        type: 'pharmacy',
        isOpen: true,
      },
      medication: 'Demo Insulin pen (fake)',
      dose: 'One injection nightly',
      quantity: '1 pen',
      instructions: null,
    },
    {
      // Active — its payment failed, so the panel shows "contact support"
      // (issue #61).
      id: 'ord-demo-rx-104',
      patientProfileId: PATIENT_PROFILE_ID,
      orderType: 'prescription',
      version: 1,
      supersedesId: null,
      status: 'active',
      issuedAt: '2026-10-17T15:00:00.000Z',
      issuedByDoctorName: 'Dr. Ficticia Example (fake)',
      requiresFacilitySelection: true,
      selectedFacility: {
        id: FACILITY_ID,
        name: 'Demo Pharmacy (fake)',
        type: 'pharmacy',
        isOpen: true,
      },
      medication: 'Demo blood thinners (fake)',
      dose: 'One tablet in the morning',
      quantity: '28 tablets',
      instructions: null,
    },
  ];

  const orderFacilities: Record<string, QualifiedOrderFacility[]> = {
    'ord-demo-rx-102': [
      {
        id: FACILITY_ID,
        userId: 'usr-facility-demo',
        name: 'Demo Pharmacy (fake)',
        type: 'pharmacy',
        location: {
          address: '1 Fixture Lane',
          city: 'Sampleton',
          latitude: 6.5244,
          longitude: 3.3792,
        },
        isOpen: true,
        capabilities: ['Prescription dispensing'],
      },
      {
        id: 'fac-demo-pharmacy-2',
        userId: 'usr-facility-pharmacy-2',
        name: 'Example Chemist (fake)',
        type: 'pharmacy',
        location: {
          address: '3 Example Street',
          city: 'Mockford',
          latitude: 6.6,
          longitude: 3.45,
        },
        isOpen: false,
        capabilities: ['Prescription dispensing'],
      },
    ],
    'ord-demo-rx-101': [
      {
        id: FACILITY_ID,
        userId: 'usr-facility-demo',
        name: 'Demo Pharmacy (fake)',
        type: 'pharmacy',
        location: {
          address: '1 Fixture Lane',
          city: 'Sampleton',
          latitude: 6.5244,
          longitude: 3.3792,
        },
        isOpen: true,
        capabilities: ['Prescription dispensing'],
      },
    ],
    'ord-demo-lab-101': [
      {
        id: 'fac-demo-lab',
        userId: 'usr-facility-lab',
        name: 'Demo Lab (fake)',
        type: 'lab',
        location: {
          address: '2 Fixture Lane',
          city: 'Sampleton',
          latitude: 6.5312,
          longitude: 3.3915,
        },
        isOpen: true,
        capabilities: ['Sample collection', 'Lab result delivery'],
      },
    ],
  };

  const apiKeys: FacilityApiKey[] = [
    {
      id: 'key-demo-1',
      facilityId: FACILITY_ID,
      name: 'Demo Lab Information System (fake)',
      prefix: 'df_live_demo1234',
      scopes: ['orders.read', 'orders.write'],
      lastUsedAt: '2026-10-18T08:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-09-20T09:00:00.000Z',
    },
    {
      id: 'key-demo-2',
      facilityId: FACILITY_ID,
      name: 'Demo Inventory Sync (fake)',
      prefix: 'df_live_demo5678',
      scopes: [],
      lastUsedAt: null,
      revokedAt: null,
      createdAt: '2026-10-01T09:00:00.000Z',
    },
  ];

  const webhookEndpoints: WebhookEndpoint[] = [
    {
      id: 'whk-demo-1',
      facilityId: FACILITY_ID,
      url: 'https://lab.example.test/webhooks/docforum',
      events: ['order.created', 'order.assigned', 'order.fulfilled'],
      secretPrefix: 'whsec_demo',
      active: true,
      lastDeliveryAt: '2026-10-18T08:05:00.000Z',
      createdAt: '2026-09-20T09:00:00.000Z',
      updatedAt: '2026-10-10T09:00:00.000Z',
    },
  ];

  const webhookDeliveries: WebhookDelivery[] = [
    {
      id: 'whd-demo-1',
      endpointId: 'whk-demo-1',
      event: 'order.created',
      status: 'success',
      responseStatusCode: 200,
      errorMessage: null,
      attemptCount: 1,
      deliveredAt: '2026-10-18T08:05:00.000Z',
      createdAt: '2026-10-18T08:05:00.000Z',
    },
    {
      id: 'whd-demo-2',
      endpointId: 'whk-demo-1',
      event: 'order.fulfilled',
      status: 'failed',
      responseStatusCode: 500,
      errorMessage: 'Mock API: simulated 500 from receiver',
      attemptCount: 3,
      deliveredAt: null,
      createdAt: '2026-10-17T12:00:00.000Z',
    },
  ];

  const walletLink: WalletLink = {
    id: 'wln-demo-1',
    facilityId: FACILITY_ID,
    stellarPublicKey: 'GDEMOFAKEKEY000000000000000000000000000000000000000000000000',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-20T09:00:00.000Z',
  };
  const paymentIntents: PaymentIntent[] = [
    {
      // Held in escrow — backs ord-demo-rx-102.
      id: 'pin-demo-1',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-102',
      status: 'escrowed',
      patientProfileId: PATIENT_PROFILE_ID,
      facilityId: FACILITY_ID,
      amountStroops: '500000000',
      escrowId: 'esc-demo-1 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000001',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-17T10:00:00.000Z',
      updatedAt: '2026-10-17T10:05:00.000Z',
    },
    {
      // Never funded — backs ord-demo-lab-101; also what the pay-with-wallet
      // panel (issue #59, behind its default-off flag) acts on in dev.
      id: 'pin-demo-2',
      orderType: 'lab_order',
      orderId: 'ord-demo-lab-101',
      status: 'created',
      patientProfileId: 'prf-patient-2',
      facilityId: FACILITY_ID,
      amountStroops: '250000000',
      escrowId: null,
      stellarTxHash: null,
      sorobanContractId: null,
      createdAt: '2026-10-18T08:10:00.000Z',
      updatedAt: '2026-10-18T08:10:00.000Z',
    },
    {
      // Released — backs the completed ord-demo-rx-100.
      id: 'pin-demo-3',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-100',
      status: 'released',
      patientProfileId: 'prf-patient-3',
      facilityId: FACILITY_ID,
      amountStroops: '750000000',
      escrowId: 'esc-demo-3 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000003',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-16T09:00:00.000Z',
    },
    {
      // Refunded — backs the cancelled ord-demo-rx-103 (issue #61).
      id: 'pin-demo-4',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-103',
      status: 'refunded',
      patientProfileId: PATIENT_PROFILE_ID,
      facilityId: FACILITY_ID,
      amountStroops: '40000000',
      escrowId: 'esc-demo-4 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000004',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-14T11:05:00.000Z',
      updatedAt: '2026-10-15T16:00:00.000Z',
    },
    {
      // Failed — backs ord-demo-rx-104 (issue #61); the panel says to
      // contact support. ord-demo-rx-101 (superseded) deliberately has no
      // intent at all, so the panel hides there.
      id: 'pin-demo-5',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-104',
      status: 'failed',
      patientProfileId: PATIENT_PROFILE_ID,
      facilityId: FACILITY_ID,
      amountStroops: '1250000000',
      escrowId: null,
      stellarTxHash: null,
      sorobanContractId: null,
      createdAt: '2026-10-17T15:05:00.000Z',
      updatedAt: '2026-10-17T15:06:00.000Z',
    },
    // Escrow held for the seeded fulfilment disputes below.
    {
      id: 'pin-dispute-demo-1',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-1',
      status: 'escrowed',
      patientProfileId: PATIENT_PROFILE_ID,
      facilityId: FACILITY_ID,
      amountStroops: '500000000',
      escrowId: 'esc-dispute-demo-1 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000011',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-14T08:05:00.000Z',
      updatedAt: '2026-10-14T08:10:00.000Z',
    },
    {
      id: 'pin-dispute-demo-2',
      orderType: 'lab_order',
      orderId: 'ord-demo-lab-1',
      status: 'escrowed',
      patientProfileId: 'prf-patient-2',
      facilityId: FACILITY_ID,
      amountStroops: '250000000',
      escrowId: 'esc-dispute-demo-2 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000012',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-18T11:20:00.000Z',
      updatedAt: '2026-10-18T11:25:00.000Z',
    },
    {
      id: 'pin-dispute-demo-3',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-2',
      status: 'escrowed',
      patientProfileId: 'prf-patient-3',
      facilityId: FACILITY_ID,
      amountStroops: '750000000',
      escrowId: 'esc-dispute-demo-3 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000013',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-19T15:30:00.000Z',
      updatedAt: '2026-10-19T15:35:00.000Z',
    },
  ];

  // Fulfilment disputes (issue #76). Every row is fake; the amounts match the
  // escrowed intents above so the detail's payment panel links somewhere real.
  const disputes: FulfillmentDispute[] = [
    {
      id: 'dsp-demo-1',
      status: 'open',
      orderId: 'ord-demo-rx-1',
      orderType: 'prescription',
      itemName: 'Demo Amoxicillin 500mg (fake)',
      patientName: 'Pat Placeholder',
      facility: { id: FACILITY_ID, name: 'Demo Pharmacy (fake)' },
      amountStroops: '500000000',
      asset: 'XLM',
      reason: 'not_received',
      openedAt: '2026-10-14T08:15:00.000Z',
      updatedAt: '2026-10-15T10:20:00.000Z',
      patientReport: {
        reason: 'not_received',
        description:
          'The pharmacy marked this fulfilled six days ago, but nothing was delivered and the courier has no record of it. I paid for next-day delivery.',
        submittedAt: '2026-10-14T08:15:00.000Z',
        submittedBy: 'Pat Placeholder',
      },
      facilityProof: {
        reference: 'DR-2041 (fake)',
        note: 'Dispensed to a courier and signed out at the counter. Courier reference CD-7781 (fake).',
        submittedAt: '2026-10-15T10:20:00.000Z',
        submittedBy: 'Mo Example (fake)',
        attachments: [
          {
            id: 'att-demo-1',
            filename: 'dispensing-record-demo.pdf',
            contentType: 'application/pdf',
            sizeBytes: 184_320,
            kind: 'dispensing_record',
            uploadedAt: '2026-10-15T10:18:00.000Z',
            uploadedBy: 'Mo Example (fake)',
          },
        ],
      },
      payment: { intentId: 'pin-dispute-demo-1', status: 'escrowed', escrowId: 'esc-dispute-demo-1 (fake)' },
      timeline: [
        {
          id: 'tl-demo-1-1',
          at: '2026-10-14T08:15:00.000Z',
          actorRole: 'patient',
          actorName: 'Pat Placeholder',
          kind: 'opened',
          summary: 'Dispute opened: order not received.',
        },
        {
          id: 'tl-demo-1-2',
          at: '2026-10-14T08:15:00.000Z',
          actorRole: 'system',
          actorName: 'docforum-core',
          kind: 'payment',
          summary: '50.00 XLM remains held in escrow while the dispute is open.',
        },
        {
          id: 'tl-demo-1-3',
          at: '2026-10-15T10:20:00.000Z',
          actorRole: 'facility',
          actorName: 'Mo Example (fake)',
          kind: 'proof_submitted',
          summary: 'Facility submitted dispensing record DR-2041 (fake) with one attachment.',
        },
      ],
      resolvedAt: null,
      resolution: null,
      resolutionNotes: null,
      resolvedBy: null,
    },
    {
      id: 'dsp-demo-2',
      status: 'open',
      orderId: 'ord-demo-lab-1',
      orderType: 'lab_order',
      itemName: 'Demo blood panel (fake)',
      patientName: 'Sam Example',
      facility: { id: FACILITY_ID, name: 'Demo Pharmacy (fake)' },
      amountStroops: '250000000',
      asset: 'XLM',
      reason: 'incomplete',
      openedAt: '2026-10-18T11:30:00.000Z',
      updatedAt: '2026-10-18T11:30:00.000Z',
      patientReport: {
        reason: 'incomplete',
        description:
          'Only one of the three tests on the order was collected. The other two were marked complete anyway and I was still charged for the full panel.',
        submittedAt: '2026-10-18T11:30:00.000Z',
        submittedBy: 'Sam Example',
      },
      facilityProof: null,
      payment: { intentId: 'pin-dispute-demo-2', status: 'escrowed', escrowId: 'esc-dispute-demo-2 (fake)' },
      timeline: [
        {
          id: 'tl-demo-2-1',
          at: '2026-10-18T11:30:00.000Z',
          actorRole: 'patient',
          actorName: 'Sam Example',
          kind: 'opened',
          summary: 'Dispute opened: incomplete order.',
        },
        {
          id: 'tl-demo-2-2',
          at: '2026-10-18T11:30:00.000Z',
          actorRole: 'system',
          actorName: 'docforum-core',
          kind: 'payment',
          summary: '25.00 XLM remains held in escrow while the dispute is open.',
        },
      ],
      resolvedAt: null,
      resolution: null,
      resolutionNotes: null,
      resolvedBy: null,
    },
    {
      id: 'dsp-demo-3',
      status: 'open',
      orderId: 'ord-demo-rx-2',
      orderType: 'prescription',
      itemName: 'Demo Metformin 850mg (fake)',
      patientName: 'Quinn Example',
      facility: { id: FACILITY_ID, name: 'Demo Pharmacy (fake)' },
      amountStroops: '750000000',
      asset: 'XLM',
      reason: 'damaged',
      openedAt: '2026-10-19T15:40:00.000Z',
      updatedAt: '2026-10-20T07:05:00.000Z',
      patientReport: {
        reason: 'damaged',
        description:
          'The sealed box arrived crushed and two blister packs were open. I did not take any of it and want a refund rather than a replacement.',
        submittedAt: '2026-10-19T15:40:00.000Z',
        submittedBy: 'Quinn Example',
      },
      facilityProof: {
        reference: 'DR-2099 (fake)',
        note: 'Packed intact and photographed before handover. See the sealed-box photo.',
        submittedAt: '2026-10-20T07:05:00.000Z',
        submittedBy: 'Mo Example (fake)',
        attachments: [
          {
            id: 'att-demo-2',
            filename: 'sealed-box-before-handover-demo.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 2_411_724,
            kind: 'photo',
            uploadedAt: '2026-10-20T07:02:00.000Z',
            uploadedBy: 'Mo Example (fake)',
          },
          {
            id: 'att-demo-3',
            filename: 'courier-handover-demo.pdf',
            contentType: 'application/pdf',
            sizeBytes: 96_256,
            kind: 'dispensing_record',
            uploadedAt: '2026-10-20T07:04:00.000Z',
            uploadedBy: 'Mo Example (fake)',
          },
        ],
      },
      payment: { intentId: 'pin-dispute-demo-3', status: 'escrowed', escrowId: 'esc-dispute-demo-3 (fake)' },
      timeline: [
        {
          id: 'tl-demo-3-1',
          at: '2026-10-19T15:40:00.000Z',
          actorRole: 'patient',
          actorName: 'Quinn Example',
          kind: 'opened',
          summary: 'Dispute opened: damaged on arrival.',
        },
        {
          id: 'tl-demo-3-2',
          at: '2026-10-19T15:40:00.000Z',
          actorRole: 'system',
          actorName: 'docforum-core',
          kind: 'payment',
          summary: '75.00 XLM remains held in escrow while the dispute is open.',
        },
        {
          id: 'tl-demo-3-3',
          at: '2026-10-20T07:05:00.000Z',
          actorRole: 'facility',
          actorName: 'Mo Example (fake)',
          kind: 'proof_submitted',
          summary: 'Facility submitted dispensing record DR-2099 (fake) with two attachments.',
        },
      ],
      resolvedAt: null,
      resolution: null,
      resolutionNotes: null,
      resolvedBy: null,
    },
  ];

  // Issue #64 — the verification review queue: two waiting applications
  // (different ages and document counts), one with no documents at all, and
  // one already decided so the detail page has history to show. All fake
  // personas on the example.test domain.
  const verifications: MockVerification[] = [
    {
      doctorProfileId: 'vrf-demo-1',
      userId: 'usr-vrf-demo-1',
      fullName: 'Dr Ada Example (fake)',
      email: 'ada.doctor@example.test',
      specialties: ['Cardiology'],
      submittedAt: '2026-10-12T09:00:00.000Z',
      createdAt: '2026-10-12T09:00:00.000Z',
      updatedAt: '2026-10-12T09:00:00.000Z',
      verificationStatus: 'pending',
      documents: [
        {
          id: 'doc-demo-1',
          fileName: 'medical-license-ada.pdf',
          contentType: 'application/pdf',
          sizeBytes: 245_760,
          uploadedAt: '2026-10-12T09:03:00.000Z',
        },
        {
          id: 'doc-demo-2',
          fileName: 'board-certification-ada.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1_843_200,
          uploadedAt: '2026-10-12T09:04:00.000Z',
        },
      ],
    },
    {
      doctorProfileId: 'vrf-demo-2',
      userId: 'usr-vrf-demo-2',
      fullName: 'Dr Bek Example (fake)',
      email: 'bek.doctor@example.test',
      specialties: ['Dermatology', 'General practice'],
      submittedAt: '2026-10-18T14:30:00.000Z',
      createdAt: '2026-10-18T14:30:00.000Z',
      updatedAt: '2026-10-18T14:30:00.000Z',
      verificationStatus: 'pending',
      documents: [
        {
          id: 'doc-demo-3',
          fileName: 'medical-license-bek.pdf',
          contentType: 'application/pdf',
          sizeBytes: 312_320,
          uploadedAt: '2026-10-18T14:35:00.000Z',
        },
      ],
    },
    {
      doctorProfileId: 'vrf-demo-3',
      userId: 'usr-vrf-demo-3',
      fullName: 'Dr Cy Example (fake)',
      email: 'cy.doctor@example.test',
      specialties: [],
      submittedAt: '2026-10-19T10:15:00.000Z',
      createdAt: '2026-10-19T10:15:00.000Z',
      updatedAt: '2026-10-19T10:15:00.000Z',
      verificationStatus: 'pending',
      documents: [],
    },
    {
      doctorProfileId: 'vrf-demo-4',
      userId: 'usr-vrf-demo-4',
      fullName: 'Dr Dee Example (fake)',
      email: 'dee.doctor@example.test',
      specialties: ['Paediatrics'],
      submittedAt: '2026-10-01T08:00:00.000Z',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-05T11:00:00.000Z',
      verificationStatus: 'verified',
      documents: [
        {
          id: 'doc-demo-4',
          fileName: 'medical-license-dee.pdf',
          contentType: 'application/pdf',
          sizeBytes: 198_656,
          uploadedAt: '2026-10-01T08:02:00.000Z',
        },
      ],
    },
  ];

  // Issue #64 reads decision history from the real audit trail contract
  // (#43); these seed the decided doctor's flip plus one unrelated event so
  // the audit page has something to show too.
  const auditEvents: AuditEvent[] = [
    {
      id: 'aud-demo-1',
      actorUserId: ADMIN_USER.id,
      actorRole: 'admin',
      entityType: 'DoctorProfile',
      entityId: 'vrf-demo-4',
      action: 'doctor.verification_status_changed',
      fromState: 'pending',
      toState: 'verified',
      requestId: null,
      metadata: null,
      createdAt: '2026-10-05T11:00:00.000Z',
    },
    {
      id: 'aud-demo-2',
      actorUserId: ADMIN_USER.id,
      actorRole: 'admin',
      entityType: 'PaymentIntent',
      entityId: 'pin-demo-1',
      action: 'payment_intent.funded',
      fromState: 'created',
      toState: 'escrowed',
      requestId: null,
      metadata: null,
      createdAt: '2026-10-17T10:05:00.000Z',
    },
  ];

  const closures: Closure[] = [
    {
      id: 'clo-holiday-new-year',
      name: 'New Year Holiday',
      description: 'Year-end holiday closure (fake)',
      status: 'active',
      allDay: true,
      start: '2026-12-24T00:00:00.000Z',
      end: '2026-12-26T23:59:59.999Z',
      facilityId: null, // platform-wide
      createdAt: '2026-10-18T09:00:00.000Z',
      updatedAt: '2026-10-18T09:00:00.000Z',
    },
    {
      id: 'clo-maintenance-pharmacy',
      name: 'Pharmacy Maintenance',
      description: 'Quarterly equipment maintenance (fake)',
      status: 'active',
      allDay: false,
      start: '2026-11-01T09:00:00.000Z',
      end: '2026-11-01T17:00:00.000Z',
      facilityId: FACILITY_ID, // scoped to the demo pharmacy
      createdAt: '2026-10-18T09:00:00.000Z',
      updatedAt: '2026-10-18T09:00:00.000Z',
    },
  ];

  // Per-specialty claims (issue #65) — deliberately fake pairs: a GP
  // claiming cardiology is exactly the PRD §8.1.5 failure this queue exists
  // to catch. `status: 'pending'` rows are the ones the queue serves.
  // Ages are relative to seed time so the age filter stays deterministic.
  const claimedAt = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const CARDIO_CLAIMED_AT = claimedAt(4 * 24); // 4 days — old enough for the 72h filter, not 168h
  const NEURO_CLAIMED_AT = claimedAt(6); // today
  const DERM_CLAIMED_AT = claimedAt(10 * 24); // 10 days — survives the 168h filter
  const specialtyClaims: SpecialtyClaim[] = [
    {
      id: 'dsc-demo-1',
      doctorId: 'prf-doctor-demo',
      doctor: { id: 'prf-doctor-demo', fullName: 'Dr. Demo Doctor (fake)' },
      specialtyId: 'spec-cardiology',
      specialty: { id: 'spec-cardiology', name: 'Cardiology', slug: 'cardiology' },
      status: 'pending',
      credential: {
        id: 'crd-demo-1',
        fileName: 'cardiology-certificate-demo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 245_760,
        uploadedAt: CARDIO_CLAIMED_AT,
      },
      rejectionReason: null,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: CARDIO_CLAIMED_AT,
      updatedAt: CARDIO_CLAIMED_AT,
    },
    {
      id: 'dsc-demo-2',
      doctorId: 'prf-doctor-demo',
      doctor: { id: 'prf-doctor-demo', fullName: 'Dr. Demo Doctor (fake)' },
      specialtyId: 'spec-neurology',
      specialty: { id: 'spec-neurology', name: 'Neurology', slug: 'neurology' },
      status: 'pending',
      // No credential attached — the UI must flag the judgement call.
      credential: null,
      rejectionReason: null,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: NEURO_CLAIMED_AT,
      updatedAt: NEURO_CLAIMED_AT,
    },
    {
      id: 'dsc-demo-3',
      doctorId: 'prf-doctor-2',
      doctor: { id: 'prf-doctor-2', fullName: 'Dr. Placeholder Example (fake)' },
      specialtyId: 'spec-dermatology',
      specialty: { id: 'spec-dermatology', name: 'Dermatology', slug: 'dermatology' },
      status: 'pending',
      credential: {
        id: 'crd-demo-3',
        fileName: 'derm-portfolio-demo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1_843_200,
        uploadedAt: DERM_CLAIMED_AT,
      },
      rejectionReason: null,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: DERM_CLAIMED_AT,
      updatedAt: DERM_CLAIMED_AT,
    },
  ];

  const notificationPreferences: Record<Role, NotificationPreferences> = {
    patient: defaultPreferencesForRole('patient'),
    doctor: defaultPreferencesForRole('doctor'),
    facility: defaultPreferencesForRole('facility'),
    admin: defaultPreferencesForRole('admin'),
  };

  return {
    dependents,
    healthEntries,
    dataExport,
    careThreads,
    appointments,
    intakeForms,
    runningDelay,
    messageThreads,
    consultationNotes,
    consultationRecords: [],
    consultationReferrals: [],
    consultationOrders: [],
    insights,
    facilityInsights,
    facilities,
    facilityMembers,
    facilityInvites,
    fulfillmentQueue,
    apiKeys,
    webhookEndpoints,
    webhookDeliveries,
    patientOrders,
    orderFacilities,
    walletLink,
    paymentIntents,
    disputes,
    consultationAddenda,
    verifications,
    specialtyClaims,
    auditEvents,
    closures,
    notificationPreferences,
  };
}
