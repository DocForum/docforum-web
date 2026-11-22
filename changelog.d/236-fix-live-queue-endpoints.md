### Live queue endpoints match docforum-core (#236)

Starting and completing a visit now use
`PATCH /appointments/:appointmentId/start` and
`PATCH /appointments/:appointmentId/complete` (previously `POST`), and today's
list uses `GET /appointments/doctor/today` with no client-computed date — the
server scopes the day from the doctor's practice time zone. The OpenAPI
fixture, generated schema, typed client, MSW handlers and dev-mock queue were
updated together. A `409` (not scheduled / not checked in / not in progress)
rolls the optimistic row back and refetches, one deferred PATCH per
appointment is enforced (a repeated tap or a second action while the first is
in flight cannot send a conflicting request), and undo after the 4-second
window is a no-op rather than a reversing PATCH. Contract tests pin the
methods and paths.
