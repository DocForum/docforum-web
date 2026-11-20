Phase W2: data export against docforum-core's real
`/patients/me/export` endpoints ([issue #259](https://github.com/DocForum/docforum-web/issues/259)).
`POST /patients/me/export` starts (or reuses) an export and its 202 body
carries the only id the API offers — there is no list endpoint. Status is
polled with `GET /patients/me/export/:id`; downloads map `409
EXPORT_NOT_READY` and `410 EXPORT_EXPIRED` to clear states with a "request a
new export" action. The password prompt was removed: core reads no body, so
asking for a password could not verify anything. The export id stays in
memory/React Query rather than storage (hard rule: no server-derived data in
localStorage), and the UI states honestly that an export requested before a
reload cannot be listed.
