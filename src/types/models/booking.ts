// --- Booking + structured intake (Phase W2, issue #2) ----------------------
// Both writes are REAL in docforum-core (docs/api/README.md, Phase 1 intake
// module + appointments module). Nothing here is assumed:
//
//   POST /intake
//     body { symptoms: [{ symptom, duration, severity }], freeTextNotes? }
//     -> IntakeForm row
//   POST /appointments
//     body { availabilitySlotId, patientProfileId? }
//     -> Appointment row; 409 when the slot is no longer open
//
// Note: `POST /intake` always records against the *caller's own* patient
// profile (core has no patientProfileId parameter), while booking may target a
// dependent. That gap is recorded in ARCHITECTURE_ESSENTIALS.md.

export type IntakeSeverity = 'mild' | 'moderate' | 'severe';

export interface SymptomInput {
  symptom: string;
  duration: string;
  severity: IntakeSeverity;
}

export interface CreateIntakeInput {
  symptoms: SymptomInput[];
  freeTextNotes?: string;
}

/** The created `IntakeForm` row. Clinical free text comes back decrypted. */
export interface IntakeRecord {
  id: string;
  patientProfileId: string;
  symptoms: SymptomInput[];
  freeTextNotes: string | null;
  createdAt: string;
}

export interface BookAppointmentInput {
  availabilitySlotId: string;
  /** Book for an active dependent; omit (or pass your own id) to book for
   * yourself. Core authorises this before booking. */
  patientProfileId?: string;
}

/** Real `AppointmentStatus` enum from docforum-core's schema. Note this is
 * narrower than the doctor-facing queue's assumed superset. */
export type BookedAppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'late_cancelled'
  | 'no_show';

/** What `POST /appointments` returns (the raw appointment row — the created
 * response does not include the availability slot relation). */
export interface BookedAppointment {
  id: string;
  patientProfileId: string;
  doctorProfileId: string;
  availabilitySlotId: string | null;
  status: BookedAppointmentStatus;
  origin: 'direct_booking' | 'referral';
  createdAt: string;
  updatedAt: string;
}
