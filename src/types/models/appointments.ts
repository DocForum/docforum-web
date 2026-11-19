// --- Appointments (Phase W2, issue #14) --------------------------------------
// The patient's own appointment row (`PatientAppointment`, declared with the
// availability section below) and `AvailabilitySlot` mirror
// backend/prisma/schema.prisma in docforum-core exactly (Phase 1 is live for
// the reads). The reschedule write, the cutoff and the optional intake
// summary are ASSUMED — docforum-core#55/#56 and #1/#2 have not landed.
// Reconcile against those issues; see ARCHITECTURE_ESSENTIALS.md "Known
// assumptions — appointment detail + reschedule".

/** ASSUMED projection (docforum-core#1/#2): `IntakeForm` in schema.prisma is
 * still a placeholder carrying only `id`/`createdAt`, and the appointment has
 * no `intakeId` yet. Kept to the fields that schema's own TODO names. */
export interface IntakeSummary {
  id: string;
  createdAt: string;
  symptoms?: string[] | null;
  freeTextNotes?: string | null;
}
