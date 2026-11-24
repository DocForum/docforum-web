---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Appointment cancellation (issue #15, assumed docforum-core#56)

docforum-core#56 (cancellation policy: patient/doctor cancellation, cutoff windows, slot release) has not landed, so both calls are assumed:

- `GET /appointments/:id/cancellation-policy` (patient, own appointment) → `CancellationPolicy` = `{lateCancellationCutoffMinutes, releaseSlotBeforeCutoff, releaseSlotAfterCutoff, recordLateCancellation, referralHandling}`. `referralHandling` is `returns_to_referral_queue | referral_unaffected | referral_closed`.
- `POST /appointments/:id/cancel` (body `{reason, note?, expectedUpdatedAt}`) → the cancelled `PatientAppointment` plus `cancellation: {cancelledAt, cancellationReason, note, late, slotReleased}`. `409` means the appointment changed since it was loaded; `422` means the backend rejected the cancellation under its policy.

The frontend never hard-codes a cutoff: `src/features/appointments/cancellation.ts` turns the served policy into the sentence shown before confirming, and disables cancelling when the policy cannot be read. Cancelling is deliberately still offered after the cutoff (it is labelled late, not blocked); it is blocked only for settled visits and a start time that has passed. `cutoffMinutes` is measured back from the slot start, and the boundary instant counts as late. Referral-origin appointments get one extra sentence describing the policy's `referralHandling`.
