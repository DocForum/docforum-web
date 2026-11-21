Phase W2: doctor directory, booking with structured intake, appointments list,
and a doctor profile with a week-view calendar (issues
[#1](https://github.com/DocForum/docforum-web/issues/1),
[#2](https://github.com/DocForum/docforum-web/issues/2),
[#3](https://github.com/DocForum/docforum-web/issues/3),
[#13](https://github.com/DocForum/docforum-web/issues/13)).

All four read/write through docforum-core's real API only:
`GET /specialties`, `GET /doctors`, `GET /availability/doctors/:id/slots`,
`POST /intake`, `POST /appointments` and `GET /appointments/mine`. New routes
are `/patient/doctors`, `/doctors/:doctorId`, `/patient/book` and
`/patient/appointments`. The doctor directory and appointments list are linked
from patient navigation. The booking flow writes the structured intake first
and treats a booking `409` as its own recoverable "time was just taken" state.
The week calendar uses roving tabindex with arrow/Home/End keys and names every
slot with its full date and time range. The only remaining gap is
`DoctorProfile.timeZone` not being in the public doctor projection; the profile
labels the doctor's zone only when present (recorded in
`ARCHITECTURE_ESSENTIALS.md` "Known assumptions").
