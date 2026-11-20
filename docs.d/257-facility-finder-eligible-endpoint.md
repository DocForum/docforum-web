---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W2 — Facility finder on `GET /facilities/eligible` (issue #257)

The finder calls docforum-core's public `GET /facilities/eligible` with
`type` (required; the "All facilities" tab sends one request per type and
merges), optional `catalogItemCode`, and `near=lat,lng` when the patient
shares a location. `radiusKm` is not sent. The endpoint has no free-text
search, so the area box filters the returned list by name, city and address
in the browser. Results are sorted nearest first with `distanceKm: null`
last. The endpoint is not yet in the vendored OpenAPI file, so the call goes
through `apiFetch` with the response shape from `types/models/facility-finder.ts`.
