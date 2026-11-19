import type { IntakeSummary } from './appointments';
import type { AppointmentStatus } from './doctor-core-flow';

// --- Patient-side appointment view (issues #32/#33/#34/#37) ------------------
// `Appointment` above is the doctor-facing row the W3 queue screens use. The
// patient screens in this feature set read docforum-core's real
// `GET /appointments/mine`, which `include`s the availability slot and returns
// the origin and audit timestamps, so it is a different shape and gets its own
// name rather than a second declaration of `Appointment`. Dates are ISO strings
// because that is what JSON carries.

export type SlotStatus = 'open' | 'held' | 'booked';
export type AppointmentOrigin = 'direct_booking' | 'referral';

export interface AvailabilitySlot {
  id: string;
  doctorProfileId: string;
  status: SlotStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  // Assumed: the manager needs the booked appointment behind a `booked`
  // slot (core's `AvailabilitySlot.appointment` 1:1 relation) to show what
  // a blocked range would take out. Not returned by the public list
  // endpoint today. See ARCHITECTURE_ESSENTIALS.md.
  appointment?: SlotAppointment | null;
}

/** Assumed projection of docforum-core's real `Appointment` model, scoped
 * to what the availability calendar renders. */
export interface SlotAppointment {
  id: string;
  status: AppointmentStatus;
  // Assumed: expanded patient identity for the doctor's own calendar. The
  // core model only carries `patientProfileId`.
  patientFullName?: string;
}

/** Mirrors the real `POST /availability/doctors/:id/slots/generate` body —
 * fixed-length, single-day, no recurrence (core ARCHITECTURE.md §6.3.6). */
export interface SlotGenerationInput {
  date: string; // 'YYYY-MM-DD'
  startHour: number;
  endHour: number;
  slotLengthMinutes: number;
}

export interface SlotGenerationResult {
  created: number;
  skipped: number;
  slots: AvailabilitySlot[];
}

/** Assumed (docforum-core#53 not landed): block a range. `conflicts` is the
 * deliberate-handling list — the backend reports booked appointments inside
 * the range rather than cancelling them. */
export interface BlockRangeInput {
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface BlockRangeResult {
  blockedSlotIds: string[];
  conflicts: SlotAppointment[];
}

export interface PatientAppointment {
  id: string;
  patientProfileId: string;
  doctorProfileId: string;
  availabilitySlotId: string;
  status: AppointmentStatus;
  origin: AppointmentOrigin;
  /** Real — `GET /appointments/mine` includes it. */
  availabilitySlot: AvailabilitySlot;
  createdAt: string;
  updatedAt: string;
  /** ASSUMED and optional (docforum-core#1/#2 — intake is not modelled yet).
   * `undefined` means "this deployment cannot answer"; `null` means "the
   * patient has not submitted one". Those are different statements and the
   * UI must not render them the same way. */
  intake?: IntakeSummary | null;
}
