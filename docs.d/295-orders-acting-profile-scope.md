---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — Orders scoped to the acting profile (issue #295)

`GET /orders/mine` takes an assumed optional `?patientProfileId=` query
parameter. Without it the endpoint returns every order for the caller, and a
guardian acting for a dependent cannot be scoped: the same browser session is
used for both profiles, so the client sends the selected profile id explicitly
(`services/orders-service.ts`, `features/orders/hooks/useOrders.ts`) and the
dev-mock filters on it. Reconcile with docforum-core when the acting-profile
contract lands; health and care-thread reads already scope by the
`/patients/:profileId/...` path.
