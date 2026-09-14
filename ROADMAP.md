# ROADMAP.md — docforum-web

> Update this file on every contribution that starts/completes/blocks an
> item below — same rule as the rest of the org, see `AGENTS.md`.

**Status: Phase W1 built (UI + client-side auth flow), not integration-tested
against a real API since `docforum-core` doesn't have one yet.**

## Phase W1 — Shell & auth
- [x] Vite app wired up — real `main.tsx`/`App.tsx`, React Router, React
  Query, Zustand. `npm run dev`/`build`/`test` all work (verified).
- [x] API client service layer pointing at `docforum-core`
  (`src/services/api-client.ts`, `auth-service.ts`) — **contract is a
  documented assumption, not confirmed**, since `docforum-core` has no
  implemented routes yet. See `ARCHITECTURE_ESSENTIALS.md` "Known
  assumptions."
- [x] Signup/login screens, corrected to **patient/doctor only** for
  self-serve signup — facility accounts are admin-invited (PRD OQ-2), so
  there is deliberately no facility option in the signup UI. Login works
  for all three roles (facility users just don't self-register). 14 tests
  passing (`npm test`), including one that asserts facility is never
  offered at signup.
- [ ] Not done: any integration test against a real `docforum-core`
  instance — none exists yet to test against.

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
- 2026-09-14 — Phase W1 implemented: Vite/React Router/React Query/Zustand
  wired up for real, auth service layer + login/signup screens + role-based
  route guards, 14 tests passing, `npm run build` verified. Corrected
  signup to patient/doctor only (facility is admin-invited per PRD OQ-2) —
  see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" for the provisional
  API contract this is built against.
