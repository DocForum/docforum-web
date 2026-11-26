Phase W5: the facility payout ledger can be exported as CSV for
reconciliation ([issue #278](https://github.com/DocForum/docforum-web/issues/278)).
"Export CSV" pages through every page of the current status/date filter
(100 rows per request, progress shown, cancellable) and downloads nothing
until the last page has arrived, so a cancelled or failed export can never
leave a partial file that looks complete. Columns are stable and
machine-readable — order reference, status token, amount in stroops, asset,
escrow id, transaction hash, timestamps — and no patient detail appears,
matching the ledger itself. The CSV helpers moved to `src/utils/csv.ts`,
where the same `escapeCsvCell` neutralises `=`, `+`, `-` and `@` formulas
for every export in the app; `features/admin-audit/csv.ts` re-exports them
so existing imports keep working.
