---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — structured intake, patient referrals and waitlist (added 2026-11-19)

These contracts are assumed; reconcile against `docforum-core` once the
corresponding backend issues land. Client types live in
`src/types/models/intake.ts`, `patient-referrals.ts` and `waitlist.ts`.

#### Structured intake write (issue #36, docforum-core#1/#2)
- `POST /appointments/:appointmentId/intake` (body: `SubmitIntakeInput`) → `IntakeForm`, the same shape the doctor-side `GET /appointments/:id/intake` already returns.
- `SubmitIntakeInput` shape: `{slotId, chiefComplaint, symptomDuration?, severity?, currentMedications: string[], allergies: string[], notes?}`.
- `409`/`404` mean the slot expired or was released while the patient was typing. The client keeps its in-memory draft, never retries automatically, and explains the slot is gone.
- Drafts are client-only: a Zustand store for the tab session, cleared on success, sign-out, idle timeout and acting-for profile switch. Nothing is written to browser storage.

#### Patient referrals (issue #4, docforum-core#5–#8)
- `GET /patients/me/referrals` → `{items: PatientReferral[]}`
- `POST /referrals/:id/accept` → `{referral, appointment: ReferralAppointment}`
- `POST /referrals/:id/decline` → `{referral}`
- `PatientReferral` adds `targetSpecialty`, `referringDoctor`, `targetDoctor`, `appointment` (`null` until accepted) and `referralNote?` to the existing `Referral` shape.
- A referral is never auto-booked: only accept creates an appointment. `409`/`404` are presented as "someone already answered this referral", not a generic failure.
- `ReferralAppointment.requiresIntake` routes the patient to `/patient/appointments/:id/intake` instead of collecting intake again inside the accept flow.

#### Waitlist with time-boxed offers (issue #16, docforum-core#57)
- `GET /patients/me/waitlist` → `{items: WaitlistEntry[], serverNow}`
- `POST /patients/me/waitlist` (body: `{doctorId?, specialtyId?, preferredWindow}`) → `WaitlistEntry`
- `PATCH /patients/me/waitlist/:id` (body: `{preferredWindow, expectedUpdatedAt}`) → `WaitlistEntry`; `409` on a concurrent edit.
- `DELETE /patients/me/waitlist/:id` → `void`
- `POST /waitlist/offers/:offerId/accept` → `{entry, appointmentId, requiresIntake}`; `409` when the hold already lapsed.
- `POST /waitlist/offers/:offerId/decline` → `{entry}`
- Countdowns are anchored to the `serverNow` sent with the list and with each offer, never to the device clock alone.
