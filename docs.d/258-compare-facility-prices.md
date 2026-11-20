---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — Facility prices for an order item (issue #258)

`docforum-core` has no public per-item facility pricing endpoint yet, so these
shapes are assumed and mirrored in `types/models/facility-finder.ts`:

- `GET /facilities/eligible?catalogItemCode=&type=&lat=&lng=&query=` →
  `EligibleFacility[]` — `FacilityWithDistance` plus
  `price: {amountStroops, effectiveFrom} | null` and `priceOnRequest: boolean`.
  `price` is the version in force now; a facility with no published price (or
  only a scheduled one) returns `price: null` with `priceOnRequest: true`. The
  finder's own filters are passed through too, so its type/distance controls
  keep working when it is opened from an order.
- `GET /facilities/:facilityId/prices` is the public view of the facility price
  history already used by facility settings. The finder reads it per card for a
  "price changed on …" note and picks the row in force itself — a future-dated
  (scheduled) version is never treated as current.
- `amountStroops` stays a string and is handled in BigInt
  (`features/payments/stroops.ts`, `features/orders/facility-price.ts`); it is
  never converted through `Number`, including when sorting by price.
- `PatientOrder.catalogItemCode` is an assumed optional field, used only to open
  the finder for that order's item; when it is absent the orders list keeps the
  ordinary facility picker and the finder shows no prices.
