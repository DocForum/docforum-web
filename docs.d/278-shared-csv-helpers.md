---
file: ARCHITECTURE_ESSENTIALS.md
section: Where things live
---
- `src/utils/csv.ts` — the only CSV writer in the app: RFC 4180 quoting,
  spreadsheet-formula neutralisation (`=`, `+`, `-`, `@`), a UTF-8 BOM for
  Excel and a timestamped filename. Features build their own column lists
  but must not hand-roll escaping (issue #278 moved the helpers here from
  `src/features/admin-audit/csv.ts`, which still re-exports them). Exports
  use stable, untranslated headers and machine values — raw status tokens,
  stroop amounts — because they are a data interchange format; see
  `docs.d/248-audit-csv-headers.md` for that rule. The facility ledger
  export (`src/features/payments/ledger-csv.ts`) pages the whole filtered
  ledger and downloads only after the last page, so a cancelled export
  never produces a partial file.
