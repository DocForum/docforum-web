---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Live queue endpoints (issue #236)

The doctor queue now matches docforum-core: visits transition with
`PATCH /appointments/:appointmentId/start` and
`PATCH /appointments/:appointmentId/complete`, and today's list is
`GET /appointments/doctor/today`. No date is sent or derived in the browser —
the backend scopes "today" from the doctor's practice time zone, so a doctor
near midnight sees the server's day. `start` accepts only a checked-in visit
and `complete` only an in-progress one (both idempotent on the state they
produce); anything else is `409`. The UI applies the change optimistically,
defers the PATCH for the 4-second undo window, sends at most one PATCH per
appointment, rolls the row back on any failure and refetches so the server
stays authoritative. Undo after the window has elapsed is a no-op: reversing a
sent transition would need a second, conflicting PATCH.
