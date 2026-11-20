Phase W2: structured intake with an autosaved draft (issue #36), patient referral
accept/decline (issue #4), the waitlist with time-boxed slot offers (issue #16),
and the full consultation thread (issue #22).

- `/patient/appointments/:appointmentId/intake` saves each answer per slot in
  memory as the patient types — never browser storage — so a route change or a
  failed submit loses nothing. The draft is cleared only after success, and a
  slot that expired mid-typing (`409`/`404`) keeps it.
- `/patient/referrals` lists pending referrals before answered ones. Accepting
  asks for confirmation, then shows the appointment `docforum-core` created
  (and links to any intake still owed) rather than just flipping the status;
  declining says the referring doctor will be told. A referral is never
  auto-booked.
- `/patient/waitlist` plus a "Join waitlist" action on every doctor search
  result and the no-match state. Held offers appear in a patient-dashboard
  banner and count down against the server's clock; the preferred window can be
  edited with `expectedUpdatedAt`, and leaving asks for confirmation.
- `MessageThread` now sends optimistically with failed/retry/discard states,
  refreshes on `message.created` events with a 30-second poll fallback, loads
  older pages without disturbing visible history, linkifies plain text safely
  (never HTML), keeps a per-thread in-memory draft, and keeps a closed thread
  readable while explaining why it can no longer be replied to.

PHI drafts are dropped on sign-out, idle timeout and acting-for profile switch.
`useUnsavedChangesGuard` moved to `src/hooks/` so the intake form can share it
with facility settings. Backend contracts for intake, referrals and waitlist are
assumed (`docforum-core` #1/#2, #5–#8 and #57) and recorded under
`ARCHITECTURE_ESSENTIALS.md` "Known assumptions" via a `docs.d/` fragment.
