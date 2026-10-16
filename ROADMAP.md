# ROADMAP.md — docforum-web

> Update this file on every contribution that starts/completes/blocks
> an item below — same rule as the rest of the org, see `AGENTS.md`.

**Status: Phase W1 built and connected to a live backend.** The deployed
Pages preview (https://docforum.github.io/docforum-web/) points at
`docforum-core`'s Render deployment; signup/login work end-to-end. One
gap remains — see `ARCHITECTURE_ESSENTIALS.md` "Known gaps against the
real API" (no refresh-on-reload flow).

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
- [ ] Restore session on reload via `POST /auth/refresh` (single-flight refresh, one retry on `401`, `RequireAuth` waits for boot refresh). Tracked as [issue #9](https://github.com/DocForum/docforum-web/issues/9) (Medium, 150 pts).
- [ ] Not done: any integration test against a real `docforum-core`
instance. Tracked as [issue #12](https://github.com/DocForum/docforum-web/issues/12) (High, 200 pts) — an end-to-end smoke test against a throwaway `docforum-core` backend.
- [ ] ESLint + lint step in CI. Tracked as [issue #11](https://github.com/DocForum/docforum-web/issues/11) (Trivial, 100 pts).
- [x] Deployed as a UI preview to GitHub Pages on every push to `main`
(`.github/workflows/deploy-pages.yml`) — see `ARCHITECTURE_ESSENTIALS.md`
"Deployment". Not a production deploy decision for the org; scoped to
this repo's static frontend only.

## Phase W2 — Patient core flow
**Fully scoped into issues #1–2, #4–5, #18–£21.**
- [ ] Doctor search (specialty + availability filter). Tracked as [issue #1](https://github.com/DocForum/docforum-web/issues/1) (Medium, 150 pts) — built against a documented assumed API shape, since `docforum-core` has no doctor-list endpoint yet.
- [ ] Booking + intake form. Tracked as [issue #2](https://github.com/DocForum/docforum-web/issues/2) (High, 200 pts) — must handle the `409` slot-taken response from `docforum-core`'s real booking-concurrency guarantee explicitly, not as a generic error.
- [ ] My appointments list. Tracked as [issue #3](https://github.com/DocForum/docforum-web/issues/3) (Trivial, 100 pts) — calls `docforum-core`'s real, already-implemented `GET /appointments/mine`, no assumption involved.
- [ ] Referral accept/decline screen. Tracked as [issue #4](https://github.com/DocForum/docforum-web/issues/4) (Medium, 150 pts) — assumed contract against `docforum-core` issues #5–8, not yet merged there.
- [x] Consultation message thread UI (shared by patients and doctors). Tracked as [issue #22](https://github.com/DocForum/docforum-web/issues/22) (High, 200 pts) — `MessageThread` feature with cursor-paginated history, optimistic send with failed/retry state, live updates via notification stream with polling fallback, and closed-thread state. Built against a documented assumed API shape (see `ARCHITECTURE_ESSENTIALS.md`) pending `docforum-core` issue #61. Fixed duplicate `identifier` declarations (`MessageThreadStatus`, `MessageSenderRole`) in `src/types/models.ts` flagged by the local syntax check before push.
- [ ] Orders list + facility-selection screen. Tracked as [issue #5](https://github.com/DocForum/docforum-web/issues/5) (Medium, 150 pts) — assumed contract against `docforum-core` issues #9–16, not yet merged there.
- [x] Health profile editor: allergies, conditions and current medications. Tracked as [issue #18](https://github.com/DocForum/docforum-web/issues/18) (High, 200 pts) — assumed contract against `docforum-core` issue #59.
- [x] Dependents management for guardians. Tracked as [issue #19](https://github.com/DocForum/docforum-web/issues/19) (High, 200 pts) — assumed contract against `docforum-core` issue #42.
- [x] Acting-for profile switcher: book and view records on behalf of a dependent. Tracked as [issue #20](https://github.com/DocForum/docforum-web/issues/20) (High, 200 pts) — client-only UI state (Zustand), threads `patientProfileId` through API calls and query keys.
- [x] Guardian consent and age-of-majority handover screens. Tracked as [issue #21](https://github.com/DocForum/docforum-web/issues/21) (High, 200 pts) — assumed contract against `docforum-core` issue #42.

## Phase W3 — Doctor core flow
**Fully scoped into issues #6–7.**
- [ ] Today's appointments / intake view. Tracked as [issue #6](https://github.com/DocForum/docforum-web/issues/6) (Medium, 150 pts).
- [ ] Consultation screen (notes, outcome, referral/order issuance). Tracked as [issue #7](https://github.com/DocForum/docforum-web/issues/7) (High, 200 pts) — the densest single screen in the app, touches three separate `docforum-core` assumed contracts; the issue explicitly allows splitting into more than one PR if the scope proves unwieldy.

## Phase W4 — Facility core flow
**Fully scoped into issue #8.**
- [ ] Fulfillment queue. Tracked as [issue #8](https://github.com/DocForum/docforum-web/issues/8) (Medium, 150 pts).
- [ ] Mark fulfilled/rejected, attach lab result. Folded into issue #8 above.

## Phase W5 — Payments UI
**Built — `docforum-core` Phase 5.5 shipped for real (custodial v1, its docs/adr/0004), so the two-layer blocker (escrow-escrow SDK → docforum-core → here) cleared.** Every call from this repo goes through `docforum-core`'s real API — hard rule 1 (no direct Stellar calls here) held throughout.
- [x] Wallet link screen (calls `docforum-core` API only, per
  `ARCHITECTURE_ESSENTIALS.md` hard rule 1 — no direct Stellar calls
  here). `src/features/payments/components/WalletLinkForm.tsx`, wired
  into `FacilityDashboardPage` — a facility links the Stellar address
  `docforum-core` is pays out to.
- [x] Payment/escrow status display — not literally "on orders" (Phase
  4's `Prescription`/`LabOrder` don't exist yet, same reason
  `docforum-core`'s `PaymentIntent.orderId` stays opaque), but a real,
  functioning admin console instead: `AdminDashboardPage` at `/admin`
  (new route, `admin`-role-gated) lets an admin create a `PaymentIntent`
  and drive it through fund → release/refund, showing live status,
  on-chain escrow id, and transaction hash — every click a real API
  call to `docforum-core`, which makes a real Stellar testnet
  transaction underneath. Admin accounts are seeded/invited, not
  self-serve (PRD OQ-2, same as facility) — this page is real once such a
  session exists, same caveat as the facility dashboard already had.
- [ ] Link transaction hashes/escrows to the Stellar testnet explorer. Tracked as [issue #10](https://github.com/DocForum/docforum-web/issues/10) (Trivial, 100 pts).

## Changelog
- 2026-09-09 — Roadmap created, carved out of docforum-core Phase 7 as part
  of the 3-repo org split.
- 2026-09-14 — Phase W1 implemented: Vite/React Router/React Query/Zustand
  wired up for real, auth service layer + login/signup screens + role-based
  route guards, 14 tests passing, `npm run build` verified. Corrected
  signup to patient/doctor only (facility is admin-invited per PRD OQ-2) —
  see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" for the provisional
  API contract this is built against.
- 2026-09-14 — Deployed as a UI preview to GitHub Pages
  (https://docforum.github.io/docforum-web/), auto-deploying on every push
  to `main`. Switched `BrowserRouter` → `HashRouter` for this (no
  server-side rewrite on Pages). Preview only — login/signup will fail
  since `docforum-core` has no live API.
- 2026-09-14 — Connected to `docforum-core`'s new Render preview
  deployment: `deploy-pages.yml` now builds with `VITE_API_BASE_URL`
  pointed at it, and `api-client.ts` sends `credentials: 'include'`
  (required for the cross-site refresh cookie). Signup/login verified
  working end-to-end against the live Pages URL.
- 2026-09-14 — Visual design refactor (no functional/phase change):
  full design-token rewrite in `global.css` (typography, color, spacing,
  radius, shadow scales), Space Grotesk/Inter, a hexagon-plus-pulse-line
  logo mark, and matching CSS Module updates across `Button`/`TextField`/
  `FormError`/`RoleSelect`/`Layout`. `HomePage` rewritten as a real landing
  page. **Not visually verified in a browser this session** — no browser
  tool was available (see chat). Typecheck/tests/build all pass; confirm
  the rendered result at the live Pages URL.
- 2026-09-14 — Installed Anthropic's real official `frontend-design` skill
  (`~/.claude/skills/frontend-design/`, verified byte-identical against
  both `github.com/anthropics/claude-code` and
  `github.com/anthropics/claude-plugins-official` — an unofficial
  third-party site the user also linked pointed at a `frontend-design-2`
  skill name that doesn't actually exist in either repo, disregarded).
  Read its critique checklist and found the design pass above hit several
  of its named "generic AI-design" tells almost exactly: an ALL-CAPS
  eyebrow label, gradient-highlighted single words in the headline, a 
  monospace face used decoratively on small badges, and a 3-card grid for
  content that's actually a sequence. Revised: dropped the eyebrow and the
  headline word-highlighting, replaced the feature-card grid with a
  connected "thread" diagram (book → refer → order → settle — the
  product's own core flow, genuinely sequential), dropped the unused IBM
  Plex Mono webfont. Saved the checklist to memory
  (`frontend_design_tells.md`) for future design work.
- 2026-09-14 — Properly installed `frontend-design@claude-plugins-official`
  via `claude plugin install` (the real plugin mechanism — supersedes the
  manual `~/.claude/skills/frontend-design/` copy above, which was
  removed). Also manually installed `Leonxlnx/taste-skill`'s
  `taste-skill` skill at `~/.claude/skills/design-taste-frontend/`
  (`npx`/`bunx skills add` both fail in this environment — Node 20.10.0
  lacks `util.styleText`, added in Node 20.12+ — so fetched the file
  directly instead; verified the repo/script/content first, same as the
  frontend-design checks).

  Applied that skill's process (brief inference → dials → solid palette →
  typography → layout) to a full redesign, per explicit direction: no
  gradients, solid colors, web3× **hospitality** (not medical this
  time — read as warmth/welcome, not clinical). New palette is solid pine
  green (`--color-accent`, trust/value) + warm brass (`--color-accent-2`,
  hospitality metal + web3 store-of-value) over warm porcelain/espresso
  neutrals — replaces the teal/violet gradient pair entirely, in every
  component (`Button`, nav CTA, hero CTA, the logo mark, the thread
  diagram's connecting line — all were gradient-filled, none are now).
  Typography swapped from Space Grotesk/Inter to Fraunces (warm serif —
  the hospitality half) + IBM Plex Sans (precise grotesk — the web3
  half), a more deliberate pairing than the previous tech-startup default.
  Hero layout switched from centered to left-aligned/editorial — taste-
  skill and the official skill both flag centered-hero-with-accent as the
  generic default treatment. Logo mark redrawn: was a filled hexagon with
  a literal medical pulse-line (too on-the-nose for "medical," and
  gradient-filled); now an outlined hexagon (hospitality threshold / web3
  node) around a three-point connected path, matching the thread
  metaphor, ending in a solid brass point where the redesign puts
  "this is where value settles
- 2026-09-15 — Consultation message thread UI (issue #22, Phase W2 —
  Patient core flow) implemented: new `src/features/messaging/` feature
  (`MessageThread`, `MessageList`, `MessageComposer`, `MessageBubble`,
  `MessageThreadClosedBanner`), `useMessageThread` hook for cursor-
  paginated history + optimistic append + failed/retry state, and a
  `messaging-service.ts` service layer calling the assumed `docforum-core`
  thread endpoints. Live updates prefer the notification stream and
  fall back to polling while the thread is visible. Message bodies are
  rendered as text only with safe linkification (no HTML); drafts are
  in-memory only (PHI, no localStorage). Fixed duplicate `identifier`
  declarations (`MessageThreadStatus`, `MessageSenderRole`) in
  `src/types/models.ts` flagged by the local syntax check before push.
