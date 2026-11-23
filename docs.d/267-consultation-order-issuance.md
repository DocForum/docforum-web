---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---

### Phase W3 — Order issuance via the real `/orders/consultations` endpoints (issue #267)

These are **real** docforum-core contracts (`backend/src/modules/orders`,
`backend/prisma/schema/{consultations,prescriptions-labs}.prisma`), not
assumptions. Everything this screen sends was checked against the current
core source; the only remaining gaps are reads core does not serve yet.

- `POST /orders/consultations` (body: `{ appointmentId, outcome?, notes? }`) → `Consultation` (`201`). Doctor-only and gated on a verified **email** as well as a verified doctor profile once orders are issued. One consultation per appointment (DB unique), so a repeat is `409`. `notes` is clinical free text, encrypted server-side — this UI never logs it.
- `POST /orders/consultations/:consultationId/prescriptions` (body: `{ facilityProfileId, items: [{drugName, dosage, frequency, duration}], amountStroops | catalogItemCode }`) → `Prescription & { paymentIntent }` (`201`). 1–100 items, each field 1–200 characters.
- `POST /orders/consultations/:consultationId/lab-orders` (body: `{ facilityProfileId, testType, urgency?: 'routine'|'urgent', notes?, amountStroops | catalogItemCode }`) → `LabOrder & { paymentIntent }` (`201`). Core takes one `testType` per order, so a multi-test form submits one request per test and shows each issued order separately; a failure mid-batch stops the loop, keeps the unissued tests in the form and shows the error, so a retry cannot re-issue the ones that already succeeded.
- **Exactly one price**, never both: `catalogItemCode` (priced from `GET /facilities/eligible?catalogItemCode=` / the facility's published list, snapshotted on the intent) or `amountStroops` (a positive integer string; the form takes XLM and converts with 7 decimals). An unknown code is `422 { code: 'PRICE_ON_REQUEST' }` and writes no order.
- `GET /facilities/eligible?type=lab|pharmacy` → `{ facilities: [{ facilityId, name, type, address, distanceKm, priceOnRequest, price }] }`. The `type` must match the order kind: a prescription needs a `pharmacy`, a lab order a `lab`.
- `GET /doctors/me` → the signed-in doctor's profile, including `verificationStatus`. Used to show the gate before the doctor fills a form in.
- The server's verified-profile gate answers `403` with `"A verified doctor profile is required to issue orders."`; the UI explains it and links to `/doctor/verification` rather than showing a raw error.
- **Read gaps:** core has no read endpoint for an issued prescription or for a newly issued lab order (`GET /lab-orders/:id` serves the older `Order` table, not `LabOrder`), and no consultation lookup by appointment id. So the panel shows each order's full detail inline from the `201` response, and the consultation id comes from the create response for the current session — reloading the consultation screen loses the ability to issue further orders until core adds those reads. Worth a `docforum-core` issue.
- Orders are append-only; corrections use core's supersede flow (`supersedesPrescriptionId` / `supersedesLabOrderId`), which this UI does not offer yet. There is no edit path for an issued order by design.
