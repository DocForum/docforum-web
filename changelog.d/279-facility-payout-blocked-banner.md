Warn facilities when payouts are blocked by a missing wallet or trustline
([issue #279](https://github.com/DocForum/docforum-web/issues/279)). The
facility dashboard and payouts page now show a persistent banner while
docforum-core is refusing this facility's payments, derived from the existing
wallet-link query plus the `FACILITY_WALLET_NOT_LINKED` and
`PAYEE_TRUSTLINE_MISSING` codes returned by facility payment calls. Copy is
written for non-technical staff — what stops working, who to ask, and what
"add a USDC trustline" means; the banner clears once the link is confirmed or
a payment call succeeds. `useFacilityLedger` now surfaces those errors instead
of hiding them behind its demo fallback, and mock mode gained `no payout
wallet` / `missing trustline` scenarios plus a payout-ledger handler so both
states are reproducible with `npm run dev:mock`. No Stellar calls were added
to this repo (hard rule 1).
