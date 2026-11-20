---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Patient payment history filters & CSV export (issue #277)

`GET /payments/mine` is assumed against `docforum-core#90` with query parameters:
- `status`: filter by payment status (`created`, `awaiting_signature`, `escrowed`, `released`, `refunded`, `failed`).
- `from` and `to`: ISO date strings filtering payment creation date range.
- `limit`: page size (default 50, up to 100).
- `cursor`: pagination cursor.

Response returns `{ intents: PaymentHistoryEntry[], nextCursor: string | null }` (or `{ items: PaymentHistoryEntry[], nextCursor: string | null }`).
Each entry retains assumed `facilityName` and `refundDeadlineAt` fields. In-memory CSV generation parses stroop amounts using BigInt without floating-point conversion, neutralises formula prefixes, and formats Stellar explorer links.
