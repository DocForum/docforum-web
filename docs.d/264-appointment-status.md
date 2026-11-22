---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---

### Appointment status: no-show and cancellation (issue #264)

`PATCH /appointments/:appointmentId/status` with body `{ status }`, where
`status` is `completed`, `cancelled` or `no_show`, returns the updated
`Appointment`. docforum-core only accepts this while the appointment is still
`scheduled`; anything else answers `409` with its `{ message }` envelope. The
client treats `409` as "someone else already acted": it closes the
confirmation, says the visit is no longer scheduled, and refetches today's
list, the live queue and insights.

Assumed details, to reconcile against core's docs:

- `Appointment` gains an optional
  `referral: { id, targetSpecialtyName, priorNoShows } | null` when the visit
  came from a referral. `priorNoShows` counts no-shows already recorded on
  that referral **before** this appointment, and drives the wording only —
  docforum-core performs the cascade. Assumed rule, matching #264's
  "re-pending or expiring": cancelling and a first no-show put the referral
  back to pending; a no-show when `priorNoShows >= 1` expires it. If core
  counts differently, `referralExplanation` in
  `src/features/doctor-today/components/AppointmentStatusActions.tsx` is the
  one place to change.
- The success response is used only to know the call worked; the UI reads the
  new state from the refetched `GET /doctor/appointments/today` and
  `GET /doctor/queue/today`, never from a hand-patched cache.
- Marks added by this PR: today's list and practice insights invalidate on
  every status change; the live queue invalidates too, although a scheduled
  appointment has not checked in and so is not in it yet.
- No-show is offered only once `Date.now() >= startsAt`; cancellation is
  offered for any scheduled visit. Both actions are available from today's
  appointments list and from the queue's "Still expected" rows, which render
  scheduled appointments that have not checked in (they never appear in the
  live queue itself).
- `completed` is accepted by the service for completeness but no UI path
  calls it — the consultation/queue flow owns completion.
- The mock API enforces the same rules: unknown statuses are `400`, unknown
  appointments `404`, and any status other than `scheduled` is `409`; a
  no-show increments the fixture appointment's `referral.priorNoShows`.
