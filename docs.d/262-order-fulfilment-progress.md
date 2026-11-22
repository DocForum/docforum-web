### Item-level fulfilment progress (issue #262)

`GET /pharmacy-orders/orders/:orderId/fulfillment-status?orderType=` returns
`{ totalItems, dispensedItems, status }`, where `status` is `issued`,
`partially_fulfilled` or `fulfilled`, derived by docforum-core from the
order's item rows. The UI renders exactly that response — it never recomputes
order-level progress from item rows it happens to have cached.

Assumed details, to reconcile against core's docs:

- `orderType` is the order's own stored value: `prescription` or `lab_order`.
  The mock API rejects a missing or mismatched `orderType` with
  `400 VALIDATION_ERROR`, so the client always sends it.
- One call per order version, keyed in React Query by order id **and**
  order type. Progress is fetched with the list/detail order shape from
  issue #5 (`/orders/mine`, `/orders/:orderId`); those remain the existing
  assumed contracts.
- Superseded versions are not queried. The list hides them and states how
  many earlier versions were replaced; the detail shows a superseded notice
  instead of a badge. The mock answers `409` if progress is requested for a
  superseded version, which guards against accidentally showing a replaced
  order's counts.
- Refresh: progress is stale immediately, refetches on window focus and every
  30 seconds, and is invalidated after remaining items are routed. There is no
  patient notification feed in this repo yet; the polling/focus refresh is
  what surfaces notification-driven dispensing changes. Wire an explicit
  invalidation here if a notification centre is added.
- A partially filled order reuses the remaining-items picker from issue #54:
  `GET /orders/:orderId/remaining-items/facilities?itemIds=` and
  `POST /orders/:orderId/route-remaining`. Routing does not itself dispense
  items, so the order stays `partially_fulfilled` until the receiving facility
  confirms dispensing.
- The endpoint is presented as real (it exists in core), but its
  `orderType` parameter values and the `409` superseded behaviour are not
  documented in the issue, so they are recorded here as assumptions rather
  than treated as confirmed.
