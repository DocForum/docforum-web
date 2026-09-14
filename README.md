# docforum-web

Frontend for DocForum — patient/doctor/facility flows described in
`docforum-core`'s `PRD.md`. This repo talks only to `docforum-core`'s API;
it never calls `docforum-escrow` directly (see that repo's README and
`docforum-core`'s `docs/adr/0002-stellar-escrow-for-fulfillment-payout.md`
for why).

**Full product context lives in `docforum-core`** — read that repo's
`PRD.md` and `ARCHITECTURE_ESSENTIALS.md` before starting frontend work
here. This repo's own `ARCHITECTURE_ESSENTIALS.md` covers only
frontend-specific rules.

**Status:** scaffolded, pre-implementation. See `ROADMAP.md`.
