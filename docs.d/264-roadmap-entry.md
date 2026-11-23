---
file: ROADMAP.md
section: Phase W3 — Doctor core flow
---
- [x] Mark a visit as no-show or cancel it from the doctor's day. Tracked as [issue #264](https://github.com/DocForum/docforum-web/issues/264) (High, 200 pts) — `src/features/doctor-today/`, `TodayAppointments` on the dashboard plus a "Still expected" section in `QueuePanel`. Both actions confirm in an accessible dialog that names the patient, explain the linked referral's fate (back to pending, or expired after repeated no-shows), call `PATCH /appointments/:id/status`, and refresh today's list, the live queue and insights. No-show is withheld until the appointment's start time; `409` says the visit is no longer scheduled and refreshes the list.
