---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Payout-blocked banner (issue #279)

- **Error envelope:** docforum-core's error body carries a machine-readable
  `code` beside `message`. `ApiError.code` (from the transport) is the primary
  source, with the raw body's `code` as a fallback; the UI branches on the
  code, never on the message text or the HTTP status. Codes:
  `FACILITY_WALLET_NOT_LINKED` (no payout wallet linked) and
  `PAYEE_TRUSTLINE_MISSING` (the linked wallet cannot hold the payout asset,
  currently USDC).
- **Assumed payout-readiness source:** `GET /payments/wallet-link` answers
  `404` (real core) or a `null` body (mock API) when nothing is linked; both
  are treated as "no payout wallet". `WalletLink` has no trustline field, so
  the wallet read cannot report trustline state.
- **There is no trustline endpoint**, and hard rule 1 forbids checking Stellar
  from the browser. The trustline banner can therefore only be raised by
  `PAYEE_TRUSTLINE_MISSING` on a facility payment call. The banner makes that
  call itself as a readiness probe (`useFacilityLedger`, default filters and
  the same query key as the payouts page, so both screens share one request),
  which is what lets the dashboard show the trustline state on a cold visit.
  It is cleared when a facility payment call succeeds again, a wallet relink
  succeeds, or the wallet link is re-confirmed. That is weaker than a real trustline
  confirmation — none is available. If docforum-core later exposes payout
  readiness (for example a `trustlineStatus` on the wallet link), reconcile
  `usePayoutBlockStatus` with it and drop the "cleared on next success" rule.
- The readiness probe reads `GET /payments/facility/ledger` (issue #271, the
  real endpoint). docforum-core is expected to return the two codes above
  when payouts are blocked; the mock handler for that endpoint answers with
  them in the `wallet_missing` / `trustline_missing` scenarios so both states
  can be reproduced in `npm run dev:mock`.
- The detected code is kept in memory only
  (`src/store/payout-block-store.ts`, no persistence), and no patient or staff
  personal data is recorded with it.
