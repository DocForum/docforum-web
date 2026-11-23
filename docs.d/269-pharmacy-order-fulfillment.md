---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---

### Pharmacy-order fulfillment writes (issue #269)

Fulfillment writes now use docforum-core's real pharmacy-order routes:
`PATCH /pharmacy-orders/fulfillments/:id` with `status: in_progress | rejected`,
and `PATCH /pharmacy-orders/fulfillments/:id/items/:itemId` with
`status: dispensed | unfulfilled` (plus an optional `quantityDispensed`). A
record's `fulfilled` state is derived server-side from its items and is never
sent by this client. Item PATCHes are one-shot and are not retried
automatically after a timeout; a `409` means another facility, or an earlier
attempt, already closed the item, so the queue is refreshed before the user
can try again.

The queue listing (`GET /facilities/:facilityId/fulfillment-queue`) remains an
assumed contract. Until docforum-core exposes a queue-listing route, the
listing must carry `fulfillmentRecordId` and `fulfillmentItemId` so the real
PATCH calls above can address the record and item; when either is absent the
client falls back to the queue row id.
