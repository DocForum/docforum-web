---
file: ROADMAP.md
section: Phase W5 — Payments UI
---
- [x] Filter patient payment history by status and date range with in-memory CSV export. Tracked as [issue #277](https://github.com/DocForum/docforum-web/issues/277): `src/pages/PaymentHistoryPage.tsx`, `src/features/payments/csv.ts`, `src/services/payment-history-service.ts`. Filters (`status`, `from`, `to`) sync to the URL via `useTableUrlState` and reset pagination on change; multi-page in-memory CSV export pages through filtered results with progress reporting, BigInt stroop amount formatting without float conversion, formula injection prevention, and explorer links.
