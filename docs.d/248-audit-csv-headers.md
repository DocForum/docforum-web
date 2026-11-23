---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Audit CSV headers stay English (issue #248)

The audit trail's client-side CSV export (`src/features/admin-audit/csv.ts`)
keeps stable English column headers (`occurred_at`, `actor_user_id`,
`entity_type`, …) in every locale. They are a data interchange format used by
admins' own spreadsheets and scripts, not UI copy: translating them would
silently break downstream filters when the operator changes language. The
export's filename, quoting and spreadsheet-formula escaping are unchanged;
only on-screen copy goes through `useT`. If a localised export is ever needed,
it should be a separate, explicitly labelled download rather than a change to
these headers.
