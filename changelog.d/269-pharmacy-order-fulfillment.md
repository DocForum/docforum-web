Fulfillment writes now go through docforum-core's real pharmacy-order routes
([issue #269](https://github.com/DocForum/docforum-web/issues/269)). Record
status is limited to `in_progress`/`rejected`; dispensing (and marking an item
unfulfilled) uses the item PATCH, which is one-shot. The queue refreshes on a
`409` and explains that the item may have been dispensed elsewhere instead of
offering a retry. `fulfilled` is derived server-side and the old client-side
fulfil action was removed.
