The facility payout ledger now reads the real
`GET /payments/facility/ledger`
([issue #271](https://github.com/DocForum/docforum-web/issues/271)). Status and
date filters, cursor pagination and lifecycle totals are server-side; totals
are no longer summed in the browser. BigInt stroop amounts stay strings, the
ledger no longer shows patient names the API doesn't return, an
`INVALID_CURSOR` resets to the newest page, and the fake fallback data was
removed so an API failure is visible instead of masked.
