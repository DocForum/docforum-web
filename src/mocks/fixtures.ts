// Seed fixtures for the mock API (issue #95). Everything here is
// DELIBERATELY FAKE: names use Placeholder/Example/Demo personas and all
// emails use the RFC 2606 reserved `example.test` domain so no fixture
// can ever be mistaken for a real person or address. Fixtures mirror the
// shapes in src/types/models.ts (which mirror docforum-core's schema) —
// see ARCHITECTURE_ESSENTIALS.md "Known assumptions" for which of those
// shapes are still assumed contracts.
import type {
  Appointment,
  CareThread,
  ConsultationAddendum,
  ConsultationNote,
  DataExport,
  Dependent,
  DoctorPracticeInsights,
  FacilityInvite,
  FacilityMember,
  FacilityWithDistance,
  FulfillmentDisputeDetail,
  FulfillmentQueueItem,
  HealthEntry,
  MessageThread,
  PaymentIntent,
  RunningDelay,
  User,
  WalletLink,
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
  runningDelay: RunningDelay;
  messageThreads: MessageThread[];
  consultationNotes: ConsultationNote[];
  insights: DoctorPracticeInsights;
  facilities: FacilityWithDistance[];
  facilityMembers: FacilityMember[];
  facilityInvites: FacilityInvite[];
  fulfillmentQueue: FulfillmentQueueItem[];
  walletLink: WalletLink | null;
  paymentIntents: PaymentIntent[];
  disputes: FulfillmentDisputeDetail[];
  consultationAddenda: ConsultationAddendum[]; // flattened, noteId-keyed lookups below
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

  const runningDelay: RunningDelay = {
    computedDelayMin: 12,
    manualOverrideMin: null,
    effectiveDelayMin: 12,
  };

  const messageThreads: MessageThread[] = [
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

  const walletLink: WalletLink = {
    id: 'wln-demo-1',
    facilityId: FACILITY_ID,
    stellarPublicKey: 'GDEMOFAKEKEY000000000000000000000000000000000000000000000000',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-20T09:00:00.000Z',
  };

  const paymentIntents: PaymentIntent[] = [
    {
      id: 'pin-demo-1',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-1',
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
      id: 'pin-demo-2',
      orderType: 'lab_order',
      orderId: 'ord-demo-lab-1',
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
      id: 'pin-demo-3',
      orderType: 'prescription',
      orderId: 'ord-demo-rx-2',
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
      id: 'pin-demo-4',
      orderType: 'lab_order',
      orderId: 'ord-demo-lab-2',
      status: 'escrowed',
      patientProfileId: 'prf-patient-2',
      facilityId: FACILITY_ID,
      amountStroops: '250000000',
      escrowId: 'esc-demo-4 (fake)',
      stellarTxHash: 'txdemo000000000000000000000000000000000000000000000000000000000004',
      sorobanContractId: 'CD demo contract (fake)',
      createdAt: '2026-10-17T08:00:00.000Z',
      updatedAt: '2026-10-17T08:05:00.000Z',
    },
  ];

  // Open disputes block a payment release; two are open here so the queue
  // exercises its oldest-first ordering, and one is already resolved so the
  // detail screen's final state is reachable in `dev:mock`. Attachment
  // fixtures deliberately carry no URL — handlers mint signed URLs.
  const disputes: FulfillmentDisputeDetail[] = [
    {
      id: 'dsp-demo-1',
      orderId: 'ord-demo-rx-1',
      orderType: 'prescription',
      orderItemName: 'Amoxicillin 500 mg capsules (30) (demo)',
      patientName: 'Pat Placeholder (demo)',
      facilityId: FACILITY_ID,
      facilityName: 'Central Pharmacy & Diagnostic Center (demo)',
      amountStroops: '500000000',
      asset: 'XLM',
      status: 'open',
      openedAt: '2026-10-11T09:15:00.000Z',
      updatedAt: '2026-10-16T11:30:00.000Z',
      reportExcerpt:
        'The label says 250 mg but my prescription is for 500 mg. I noticed after taking one dose and want the correct medication or a refund.',
      patientReport:
        "I collected this on 10 October. The printed label says 250 mg three times a day, but my prescription (and the copy in my care timeline) says 500 mg. I took one dose before noticing and I'm worried. I'd like the correct medication or a refund. (demo report)",
      attachmentCount: 2,
      facilityProof:
        'Our dispensing log shows batch B-9912 was labelled at 500 mg. The attached photo was taken at the counter before handover. We are checking whether a second label was printed by mistake. (demo proof)',
      attachments: [
        {
          id: 'att-demo-1',
          fileName: 'dispensing-log-demo.txt',
          contentType: 'text/plain',
          sizeBytes: 2048,
          uploadedAt: '2026-10-12T10:05:00.000Z',
          uploadedBy: 'facility',
        },
        {
          id: 'att-demo-2',
          fileName: 'label-photo-demo.png',
          contentType: 'image/png',
          sizeBytes: 184320,
          uploadedAt: '2026-10-12T10:06:00.000Z',
          uploadedBy: 'facility',
        },
      ],
      timeline: [
        {
          id: 'dtl-demo-1-1',
          kind: 'opened',
          at: '2026-10-11T09:15:00.000Z',
          actor: 'Pat Placeholder (demo)',
          actorRole: 'patient',
          summary: 'Reported a dose mismatch on the dispensed prescription.',
        },
        {
          id: 'dtl-demo-1-2',
          kind: 'facility_evidence',
          at: '2026-10-12T10:06:00.000Z',
          actor: 'Frank Facility (demo)',
          actorRole: 'facility',
          summary: 'Uploaded the dispensing log and a photo of the label.',
        },
        {
          id: 'dtl-demo-1-3',
          kind: 'admin_note',
          at: '2026-10-16T11:30:00.000Z',
          actor: 'Al Admin (demo)',
          actorRole: 'admin',
          summary: 'Asked the facility to confirm the batch number and whether the label was reprinted.',
        },
      ],
      paymentIntentId: 'pin-demo-1',
      escrowId: 'esc-demo-1 (fake)',
      resolution: null,
      resolutionNote: null,
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'dsp-demo-2',
      orderId: 'ord-demo-lab-2',
      orderType: 'lab',
      orderItemName: 'Fasting lipid panel (demo)',
      patientName: 'Sam Example (demo)',
      facilityId: FACILITY_ID,
      facilityName: 'Central Pharmacy & Diagnostic Center (demo)',
      amountStroops: '250000000',
      asset: 'XLM',
      status: 'open',
      openedAt: '2026-10-17T08:40:00.000Z',
      updatedAt: '2026-10-18T09:00:00.000Z',
      reportExcerpt:
        'The sample was taken but no results have appeared. I was told they would be ready in two days and I need them for an appointment.',
      patientReport:
        'The sample was taken on 16 October and I was told results would be ready in two days. Nothing has appeared in my care timeline and my appointment is tomorrow. Please either send the result or refund me. (demo report)',
      attachmentCount: 1,
      facilityProof: null,
      attachments: [
        {
          id: 'att-demo-3',
          fileName: 'sample-collection-log-demo.csv',
          contentType: 'text/csv',
          sizeBytes: 4096,
          uploadedAt: '2026-10-18T09:00:00.000Z',
          uploadedBy: 'facility',
        },
      ],
      timeline: [
        {
          id: 'dtl-demo-2-1',
          kind: 'opened',
          at: '2026-10-17T08:40:00.000Z',
          actor: 'Sam Example (demo)',
          actorRole: 'patient',
          summary: 'Reported that no lab result had been delivered.',
        },
        {
          id: 'dtl-demo-2-2',
          kind: 'facility_evidence',
          at: '2026-10-18T09:00:00.000Z',
          actor: 'Frank Facility (demo)',
          actorRole: 'facility',
          summary: 'Uploaded the sample collection log.',
        },
      ],
      paymentIntentId: 'pin-demo-4',
      escrowId: 'esc-demo-4 (fake)',
      resolution: null,
      resolutionNote: null,
      resolvedAt: null,
      resolvedBy: null,
    },
    {
      id: 'dsp-demo-3',
      orderId: 'ord-demo-rx-2',
      orderType: 'prescription',
      orderItemName: 'Metformin 850 mg tablets (60) (demo)',
      patientName: 'Quinn Example (demo)',
      facilityId: FACILITY_ID,
      facilityName: 'Central Pharmacy & Diagnostic Center (demo)',
      amountStroops: '750000000',
      asset: 'XLM',
      status: 'resolved_facility',
      openedAt: '2026-10-05T10:00:00.000Z',
      updatedAt: '2026-10-08T14:20:00.000Z',
      reportExcerpt: 'The tablets were a different shape from last month and I was worried they were wrong.',
      patientReport:
        'The tablets were a different shape from last month and I was worried they were wrong. The pharmacy said the manufacturer changed. (demo report)',
      attachmentCount: 1,
      facilityProof:
        'The manufacturer changed the tablet shape in September; the batch and dose are identical to the prescription. The wholesaler letter is attached. (demo proof)',
      attachments: [
        {
          id: 'att-demo-4',
          fileName: 'manufacturer-letter-demo.pdf',
          contentType: 'application/pdf',
          sizeBytes: 51200,
          uploadedAt: '2026-10-06T11:00:00.000Z',
          uploadedBy: 'facility',
        },
      ],
      timeline: [
        {
          id: 'dtl-demo-3-1',
          kind: 'opened',
          at: '2026-10-05T10:00:00.000Z',
          actor: 'Quinn Example (demo)',
          actorRole: 'patient',
          summary: 'Reported that the dispensed tablets looked different.',
        },
        {
          id: 'dtl-demo-3-2',
          kind: 'facility_evidence',
          at: '2026-10-06T11:00:00.000Z',
          actor: 'Frank Facility (demo)',
          actorRole: 'facility',
          summary: 'Uploaded the manufacturer’s batch-change letter.',
        },
        {
          id: 'dtl-demo-3-3',
          kind: 'resolved',
          at: '2026-10-08T14:20:00.000Z',
          actor: 'Al Admin (demo)',
          actorRole: 'admin',
          summary: 'Resolved for the facility — the batch and dose matched the prescription.',
        },
      ],
      paymentIntentId: 'pin-demo-3',
      escrowId: 'esc-demo-3 (fake)',
      resolution: 'facility',
      resolutionNote:
        'Batch and dose matched the prescription; the manufacturer’s letter confirms the shape change. Escrow released to the facility. (demo note)',
      resolvedAt: '2026-10-08T14:20:00.000Z',
      resolvedBy: 'Al Admin (demo)',
    },
  ];

  return {
    dependents,
    healthEntries,
    dataExport,
    careThreads,
    appointments,
    runningDelay,
    messageThreads,
    consultationNotes,
    insights,
    facilities,
    facilityMembers,
    facilityInvites,
    fulfillmentQueue,
    walletLink,
    paymentIntents,
    disputes,
    consultationAddenda,
  };
}
