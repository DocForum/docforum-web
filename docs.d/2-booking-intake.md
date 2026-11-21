---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — Booking & structured intake (issue #2)

Both writes are real; nothing in this flow is mocked or assumed.

- `POST /intake` (patient) — body
  `{ symptoms: [{ symptom, duration, severity: 'mild'|'moderate'|'severe' }],
  freeTextNotes? }` → the created `IntakeForm` row. `symptoms` requires at
  least one entry.
- `POST /appointments` (patient) — body
  `{ availabilitySlotId, patientProfileId? }` → the created `Appointment` row
  (`{ id, patientProfileId, doctorProfileId, availabilitySlotId, status,
  origin, createdAt, updatedAt }`). `409` means the slot is no longer open;
  the UI treats that as its own recoverable state, not a generic failure.

Gaps worth knowing:
- The intake write and the booking write are separate calls with no link
  between them yet — core's `POST /appointments` does not accept an intake id
  (the `intakeId` TODO in its schema remains open). The booking flow submits
  intake first so a 409 never leaves a confirmed visit without intake.
- `POST /intake` always records against the caller's own patient profile; it
  has no `patientProfileId` parameter. When a guardian books for a dependent
  (`patientProfileId` on the booking), the appointment targets the dependent
  but the intake row is the guardian's. The booking screen says so plainly.
- `GET /appointments/mine` carries `doctorProfileId` but no clinician name;
  patient screens resolve names from the public `GET /doctors` directory and
  show "Your clinician" when a doctor is no longer listed.
