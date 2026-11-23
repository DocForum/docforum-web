### Admin audit, disputes and feature flags in Spanish (#248)

The audit trail, fulfilment disputes and feature-flag consoles
(`src/features/admin-audit/`, `src/features/admin-disputes/`,
`src/features/admin-flags/`) now take every string through `useT`, including
filter labels, statuses, validation and resolution copy, placeholders and
accessibility labels. Pure helpers (`filters`, `queue`, `resolution`, `format`,
`flags`, `draft`, `errors`) accept an optional translator, defaulting to the
English ICU fallback so existing tests and non-React callers keep working.
Audit actions, flag keys, entity ids and user-supplied reasons stay as the API
sent them. CSV export headers remain stable English (documented in
`ARCHITECTURE_ESSENTIALS.md`), and Spanish-rendering tests cover all three
consoles.
