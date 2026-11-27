import type { IntakeForm } from './doctor-core-flow';

// --- Structured intake (Phase W2 — issue #36; booking/intake is #2) ----------
// ASSUMED contract: docforum-core#1/#2 do not model structured intake yet
// (`IntakeForm` in its schema is still a placeholder). The draft below is
// client-only state; the submit body mirrors the fields the doctor-side
// intake view already expects. See ARCHITECTURE_ESSENTIALS.md "Known
// assumptions".

/** Every field the patient can type. Strings (not arrays) because these back
 * form inputs; they are split into lists only on submit. */
export interface IntakeDraftFields {
  chiefComplaint: string;
  symptomDuration: string;
  severity: string;
  currentMedications: string;
  allergies: string;
  notes: string;
}

/** One autosaved draft, keyed by availability slot (issue #36's "keyed by
 * slot"). `appointmentId` is stored too so a draft can never be shown on a
 * different appointment that happens to reuse the slot id. */
export interface IntakeDraft {
  slotId: string;
  appointmentId: string;
  fields: IntakeDraftFields;
  /** When the in-memory copy was last written — shown as "kept in this tab". */
  savedAt: string;
}

export interface SubmitIntakeInput {
  slotId: string;
  chiefComplaint: string;
  symptomDuration?: string | null;
  severity?: number | null;
  currentMedications: string[];
  allergies: string[];
  notes?: string | null;
}

/** Response to `POST /appointments/:appointmentId/intake` — the same shape the
 * doctor's read (`GET /appointments/:id/intake`) returns. */
export type SubmittedIntake = IntakeForm;
