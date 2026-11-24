---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W3 — Doctor core flow (confirmed appointment APIs; other contracts assumed)
---
### Referrals I've sent (issue #265)

`GET /referrals/created` is real in docforum-core: doctor-only, returns a
plain array (no cursor/`{items}` envelope), newest first, including expired
rows (`referringDoctorNotifiedAt`, `expiredReason`) and loop-flagged rows
(`loopFlaggedAt`, `loopFlagReason`). The view sorts attention-needing rows
(pending, loop-flagged, expired-and-notified) ahead of settled ones and never
renders `snapshotNotes` — the list is triage, and the snapshot stays on the
detail screen.

**Assumed:** the rows expand `targetDoctor` (`{id, fullName}`) and
`targetSpecialty` (`{id, name, slug}`) alongside `targetDoctorId` /
`targetSpecialtyId`. Core currently returns only the scalar ids; when the
names are absent the UI falls back to a short id prefix. Reconcile the type in
`src/types/models/sent-referrals.ts` if core keeps the raw shape or adds a
different expansion. `GET /referrals/:id` remains the assumed role-scoped
detail contract from docforum-core#307 (referring doctor included); rows open
it with `?from=sent` so the back link returns to this view.
