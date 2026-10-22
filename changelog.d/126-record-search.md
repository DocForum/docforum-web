Phase W7: search across a user's own loaded records
([issue #126](https://github.com/DocForum/docforum-web/issues/126)).
`src/features/search-records/` builds an in-memory index from only the active
acting-for profile's care-thread cache or the signed-in doctor's
appointment/message caches. Header search groups keyboard-navigable results
and links to the corresponding record views; logout clears React Query data
and profile changes discard the active query/index. `createRecordIndex` is the
replacement seam for a future authenticated backend search service; no new
API contract is assumed.
