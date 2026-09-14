# ROADMAP.md — docforum-web

> Update this file on every contribution that starts/completes/blocks an
> item below — same rule as the rest of the org, see `AGENTS.md`.

**Status: Not started.** Blocked on `docforum-core` having real, callable
API endpoints (its Phase 1/2).

## Phase W1 — Shell & auth
- [ ] Vite app wired up (currently placeholder `main.tsx`/`App.tsx`).
- [ ] API client service layer pointing at `docforum-core`.
- [ ] Signup/login screens per role (patient/doctor/facility).

## Phase W2 — Patient core flow
- [ ] Doctor search (specialty + availability filter).
- [ ] Booking + intake form.
- [ ] My appointments list.
- [ ] Referral accept/decline screen.
- [ ] Orders list + facility-selection screen.

## Phase W3 — Doctor core flow
- [ ] Today's appointments / intake view.
- [ ] Consultation screen (notes, outcome, referral/order issuance).

## Phase W4 — Facility core flow
- [ ] Fulfillment queue.
- [ ] Mark fulfilled/rejected, attach lab result.

## Phase W5 — Payments UI (depends on docforum-core Phase 5.5)
- [ ] Wallet link screen (calls `docforum-core` API only, per
  `ARCHITECTURE_ESSENTIALS.md` hard rule 1 — no direct Stellar calls here).
- [ ] Payment/escrow status display on orders.

## Changelog
- 2026-09-09 — Roadmap created, carved out of docforum-core Phase 7 as part
  of the 3-repo org split.
