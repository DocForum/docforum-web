---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Patient payment intent detail (issue #272)

Patient payment receipts use `GET /payments/intents/:id`. The detail query is
seeded from the in-memory payment-history cache and still refetches by id.
Authorization and not-found responses both produce a 404; the receipt view
shows "Payment not found" and a link back to payment history.
