- Doctors can now issue **multi-item prescriptions** and **lab orders** from
  the consultation screen, against docforum-core's real endpoints
  (`POST /orders/consultations/:consultationId/prescriptions` and
  `.../lab-orders`). Closing the visit creates the consultation
  (`POST /orders/consultations`), then the outcome panel offers a
  Prescription tab (one or more medications, each with dose, frequency and
  duration) and a Lab order tab (one or more tests, urgency and optional
  clinical instructions).
- Every order carries exactly one price: a facility catalog item code priced
  from that facility's published list, or a manual amount typed in XLM and
  converted to integer stroops. The dispensing pharmacy / fulfilling lab is
  chosen from `GET /facilities/eligible`, so an order can't be sent to a
  facility that can't fulfil it.
- Issued orders are shown with their payment intent, full details and an
  append-only notice, and a profile that isn't verified sees the gate up
  front plus a link to the new `/doctor/verification` page. A `403` from the
  API is explained in the form (with the same link), never as a generic error.
