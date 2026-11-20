Phase W2: the facility finder uses docforum-core's real public
`GET /facilities/eligible` instead of the assumed `GET /facilities`
([issue #257](https://github.com/DocForum/docforum-web/issues/257)).
`type` is always sent (the "All facilities" tab asks once per type and
merges), location goes as `near=lat,lng`, the unsupported free-text `query`
is applied client-side to name, city and address, and facilities with an
unknown distance are listed last as "Distance unknown". The mock API returns
core's `400` for a missing type and for `radiusKm` without `near`.
