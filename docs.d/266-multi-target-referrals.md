---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Multi-target consultation referrals (issue #266)

Consultation referrals use `POST /consultations/:consultationId/referrals`
with `targets: [{ targetDoctorId?, targetSpecialtyId?, snapshotNotes }]`.
Specialty-only targets are routed to an eligible doctor. The batch is atomic;
the UI maps no-eligible-target and loop/hop `422` errors and duplicate-target
`400` errors. Optional doctor selection excludes the referring doctor.
