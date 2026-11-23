---
file: ROADMAP.md
section: Phase W3 — Doctor core flow
---
- [x] Issue prescriptions and lab orders through the real `/orders/consultations/:id` endpoints. Tracked as [issue #267](https://github.com/DocForum/docforum-web/issues/267) (High, 200 pts) — `src/features/consultation/`, `ConsultationOutcomePanel` on `/doctor/consultation/:appointmentId`. Closing the visit creates the consultation (`POST /orders/consultations`), then a Prescription tab issues one or more medications (dose, frequency, duration) and a Lab order tab issues one or more tests (urgency, optional clinical instructions), each priced from a facility catalog code or a manual XLM amount converted to stroops and sent to a `GET /facilities/eligible` facility of the right type. Issued orders show their payment intent and full detail inline with an append-only notice. The verified-profile gate is shown up front and explained on `403` with a link to `/doctor/verification`.
