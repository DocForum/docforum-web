---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Pharmacy fulfillment routing (issue #263)

Pharmacy routing uses `POST /pharmacy-orders/fulfillments` with
`{ orderType: 'prescription', orderId, facilityId, orderItemIds? }`. Omitting
`orderItemIds` routes the whole order; providing remaining item ids performs
partial routing. `400` identifies an item outside the order and `409` means an
item was already dispensed elsewhere. The UI refreshes order state after both
success and conflict recovery.
