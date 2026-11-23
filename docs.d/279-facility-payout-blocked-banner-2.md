---
file: ROADMAP.md
section: Phase W5 — Payments UI
---
- [x] Warn facilities when payouts are blocked by a missing wallet or
  trustline. Tracked as [issue #279](https://github.com/DocForum/docforum-web/issues/279):
  persistent, actionable banner on the facility dashboard and payouts page,
  derived from the wallet-link query plus docforum-core's
  `FACILITY_WALLET_NOT_LINKED` / `PAYEE_TRUSTLINE_MISSING` responses, with
  trustline guidance for non-technical staff. Clears once the link is
  confirmed; no Stellar calls from the browser (hard rule 1).
