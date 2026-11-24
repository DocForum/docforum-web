import type { ReferralStatus } from './stuck-referrals';

// --- Phase W3 — Doctor core flow (assumed, docforum-core issues #61/#129 not
// landed yet) ---------------------------------------------------------------
// These shapes mirror the smallest contract needed to build the doctor's
// today view, live queue, inbox, and consultation sign-off. Reconcile once
// docforum-core defines them; record any deviation in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions".

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// The referral an appointment came from, when it came from one. The doctor
// needs this to explain what a no-show or cancellation does to the referral.
// Assumed shape — see docs.d/264-appointment-status.md.
export interface AppointmentReferral {
  id: string;
  targetSpecialtyName: string;
  /** No-shows already recorded on this referral before this appointment. */
  priorNoShows: number;
}

export interface Appointment {
  id: string;
  doctorProfileId: string;
  patientProfileId: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason?: string | null;
  checkInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  referral?: AppointmentReferral | null;
}

export interface IntakeForm {
  id: string;
  appointmentId: string;
  patientProfileId: string;
  submittedAt: string;
  chiefComplaint: string;
  symptomDuration?: string | null;
  severity?: number | null;
  currentMedications: string[];
  allergies: string[];
  notes?: string | null;
}

export interface QueueEntry {
  appointmentId: string;
  patientProfileId: string;
  fullName: string;
  checkedInAt: string;
  queuePosition: number;
  status: 'checked_in' | 'in_progress' | 'completed';
}

export interface RunningDelay {
  computedDelayMin: number;
  manualOverrideMin: number | null;
  effectiveDelayMin: number;
}

export interface UpdateRunningDelayInput {
  manualOverrideMin: number | null;
}

export interface DoctorMessageThread {
  id: string;
  patientProfileId: string;
  patientName: string;
  lastMessageAt: string;
  unreadCount: number;
  lastPreview?: string | null;
  waitingMinutes?: number | null;
  closingSoon?: boolean;
}

export type ThreadFilter = 'all' | 'unread' | 'closing_soon';

export interface ConsultationNote {
  id: string;
  appointmentId: string;
  content: string;
  signedAt?: string | null;
  signedBy?: string | null;
  autoSignOffAt?: string | null;
  addenda: ConsultationAddendum[];
}

export interface ConsultationAddendum {
  id: string;
  noteId: string;
  content: string;
  createdAt: string;
}

export interface AddAddendumInput {
  content: string;
}

export type ConsultationOutcome = 'resolved' | 'referred' | 'follow_up_needed';

export interface ConsultationRecord {
  id: string;
  appointmentId: string;
  notes: string;
  outcome: ConsultationOutcome;
  followUpAfterDays?: number | null;
  recordedAt: string;
}

export interface RecordConsultationInput {
  notes: string;
  outcome: ConsultationOutcome;
  followUpAfterDays?: number | null;
}

export interface ConsultationReferral {
  id: string;
  consultationId: string;
  targetSpecialty: string;
  reason: string;
  status: ReferralStatus;
  createdAt: string;
}

export interface CreateConsultationReferralInput {
  targetSpecialty: string;
  reason: string;
}

export interface ConsultationPrescriptionInput {
  orderType: 'prescription';
  medication: string;
  dose: string;
  instructions?: string | null;
}

export interface ConsultationLabOrderInput {
  orderType: 'lab_order';
  testName: string;
  instructions?: string | null;
}

export type ConsultationOrderInput = ConsultationPrescriptionInput | ConsultationLabOrderInput;

export interface ConsultationIssuedOrder {
  id: string;
  consultationId: string;
  orderType: ConsultationOrderInput['orderType'];
  medicationOrTest: string;
  instructions?: string | null;
  issuedAt: string;
}
