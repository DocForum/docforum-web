# ROADMAP.md — docforum-web

> Update this file on every contribution that starts/completes/blocks an
> item below — same rule as the rest of the org, see `AGENTS.md`.

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
- [ ] Not done: any integration test against a real `docforum-core`
  instance — none exists yet to test against.
- [x] Deployed as a UI preview to GitHub Pages on every push to `main`
  (`.github/workflows/deploy-pages.yml`) — see `ARCHITECTURE_ESSENTIALS.md`
  "Deployment". Not a production deploy decision for the org; scoped to
  this repo's static frontend only.

## Phase W2 — Patient core flow
**Fully scoped into issues #1–#2, #4–#5.**
- [ ] Doctor search (specialty + availability filter). Tracked as [issue #1](https://github.com/DocForum/docforum-web/issues/1) (Medium, 150 pts) — built against a documented assumed API shape, since `docforum-core` has no doctor-list endpoint yet.
- [ ] Booking + intake form. Tracked as [issue #2](https://github.com/DocForum/docforum-web/issues/2) (High, 200 pts) — must handle the `409` slot-taken response from `docforum-core`'s real booking-concurrency guarantee explicitly, not as a generic error.
- [ ] My appointments list. Tracked as [issue #3](https://github.com/DocForum/docforum-web/issues/3) (Trivial, 100 pts) — calls `docforum-core`'s real, already-implemented `GET /appointments/mine`, no assumption involved.
- [ ] Referral accept/decline screen. Tracked as [issue #4](https://github.com/DocForum/docforum-web/issues/4) (Medium, 150 pts) — assumed contract against `docforum-core` issues #5–#8, not yet merged there.
- [ ] Orders list + facility-selection screen. Tracked as [issue #5](https://github.com/DocForum/docforum-web/issues/5) (Medium, 150 pts) — assumed contract against `docforum-core` issues #9–#16, not yet merged there.

## Phase W3 — Doctor core flow
**Fully scoped into issues #6–#7.**
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
  `docforum-core` pays out to.
- [x] Payment/escrow status display — not literally "on orders" (Phase
  4's `Prescription`/`LabOrder` don't exist yet, same reason
  `docforum-core`'s `PaymentIntent.orderId` stays opaque), but a real,
  functioning admin console instead: `AdminDashboardPage` at `/admin`
  (new route, `admin`-role-gated) lets an admin create a `PaymentIntent`
  and drive it through fund → release/refund, showing live status,
  on-chain escrow id, and transaction hash — every click a real API
  call to `docforum-core`, which makes a real Stellar testnet
  transaction underneath. Admin accounts are seeded/invited, not
  self-serve (PRD OQ-2, same as facility) — this page is real once such
  a session exists, same caveat as the facility dashboard already had.

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
  gradients, solid colors, web3 × **hospitality** (not medical this
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
  "this is where value settles." Not visually verified in a browser this
  session (still no browser tool available) — typecheck/tests/build all
  pass; confirm the rendered result at the live Pages URL.
- 2026-09-14 — Applied `gsap-core` and `svg-animations` (installed
  earlier) to two places, deliberately not "everywhere" — motion stays
  restrained (trust-first territory) and tied to what the marks already
  represent, per both design skills' "spend boldness in one place"
  guidance:
  - **Logo** (`Layout` header, mounts once): the three-point path now
    draws itself in via `stroke-dasharray`/`stroke-dashoffset` (the
    svg-animations path-drawing technique), dots popping in as the line
    reaches them, GSAP-driven and timed.
  - **HomePage thread diagram**: connector lines are now real SVG
    `<line>` elements (were CSS-colored `<div>`s) that draw themselves
    left to right as the section scrolls into view — the diagram extends
    the same way the thread it represents does. Triggered by a plain
    `IntersectionObserver` (no ScrollTrigger plugin — not installed, core
    GSAP only), plays once. Hero headline/subhead/CTA also get one
    staggered fade-up entrance on mount — a single reveal, not scattered
    per-section effects.

  Both wrapped in `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`
  — reduced-motion users get the finished state immediately, no animation,
  per the official skill's accessibility floor. Added `gsap` as a real
  dependency (+~29KB gzip to the bundle — 97KB → 126KB). Typecheck, all
  14 tests, and build all pass. Not visually verified in a browser this
  session (still no browser tool available) — the animation-specific risk
  here is real (SVG geometry APIs, timing, matchMedia behavior are all
  much harder to fully trust from code review alone than static CSS was)
  — please actually look at this one before trusting it.
- 2026-09-14 — Thread diagram now loops continuously (explicit user
  request — overrides the "single reveal, not scattered/repeated
  effects" default both design skills recommend, which is fine per those
  same skills: "where the brief pins down a direction, follow it
  exactly"). The one-shot `IntersectionObserver` trigger became a
  `gsap.timeline({repeat: -1, yoyo: true, repeatDelay: 1})`: draws in
  (~1.7s) → holds fully drawn (~1.4s) → undraws in reverse (~1.7s) →
  pauses (~1s) → repeats. Still gated by
  `prefers-reduced-motion` (no animation at all, not just non-looping,
  for those users) and still only runs while the section is actually on
  screen — the `IntersectionObserver` now play()/pause()s the loop
  instead of firing once, so it doesn't spend cycles off-screen.
- 2026-09-14 — Loading UX pass, three gaps addressed:
  - **Pre-hydration shell**: `index.html` had nothing but `<div
    id="root">` — blank white page for however long the JS bundle
    (~126KB gzip, now including GSAP) takes to download/parse/run. Added
    a static HTML/CSS-only loading shell (brand mark + "Loading
    DocForum…", pulse animation) inside `#root`, using `var(--color-*,
    fallback)` so it's styled correctly independent of the app's own
    stylesheet load order. React's `createRoot().render()` replaces it
    automatically — no cleanup script needed.
  - **Cold-start-aware auth loading**: docforum-core's Render deployment
    (free tier, `docs/adr/0003-render-preview-deployment.md`) spins down
    after 15 minutes idle — first request after that can take up to
    ~a minute. Added `useSlowRequestHint(isPending, delayMs=4000)`
    (`src/hooks/`, finally has real content — placeholder README
    removed): past 4s of a pending login/signup, shows "the server may
    be waking up... this can take up to a minute" instead of leaving a
    spinner with no explanation indistinguishable from "broken."
  - **`Button` gained a proper `loading` prop** (spinner + `aria-busy`,
    implicitly disabled) — new `Spinner` component (`src/components/`,
    functional motion exempted from the restrained-motion default since
    it communicates real state, but still slows under
    `prefers-reduced-motion` rather than freezing). Replaces manual
    `disabled={mutation.isPending}` text-only toggling on
    login/signup/logout buttons.

  New tests: `Button.test.tsx` (loading/disabled states),
  `useSlowRequestHint.test.ts` (timing behavior — real timers + small
  delays, not `vi.useFakeTimers()`, which hangs Testing Library's
  auto-cleanup in this environment). 21/21 tests, typecheck, and build
  all pass.
- 2026-09-14 — Added `.github/ISSUE_TEMPLATE/bug_report.md` (identical
  copy across all three org repos — see `docforum-core`'s changelog for
  the sourcing note: a user-supplied bug-report structure plus
  drips.network's "Creating Meaningful Issues" guide).
- 2026-09-14 — Scoped the start of Phase W2 into three real GitHub issues
  (#1–#3): doctor search, booking + intake form, my appointments list.
  Two of the three (search, booking) are explicitly built against a
  **documented assumed API contract** — `docforum-core`'s Phase 2 doesn't
  exist yet — flagged plainly in each issue rather than implied as
  already-working; the third (appointments list) calls a real,
  already-implemented `docforum-core` endpoint with no assumption
  involved. Booking's issue specifically calls out handling the `409`
  slot-taken response as a first-class case, not a generic error path —
  that response is `docforum-core`'s actual double-booking-prevention
  guarantee (Phase 1) surfacing at the UI layer for the first time.
  Referral and orders screens intentionally left unscoped — not enough of
  a real contract to assume against yet (`docforum-core` Phase 3/4 don't
  exist). Phase W2 checklist above updated to link each item to its issue.
- 2026-09-14 — Scoped the rest of the frontend roadmap that has a real
  (even if assumed) backend contract to build against: five more issues
  (#4–#8) covering the rest of W2 (referral accept/decline, orders +
  facility-selection — now buildable since `docforum-core` opened issues
  #5–#16 for the referral/order/facility work they assume against), all
  of W3 (doctor's today view, and a deliberately large consultation
  screen issue that explicitly permits splitting into multiple PRs given
  it touches three separate assumed contracts at once), and all of W4
  (facility fulfillment queue + status + lab-result attachment, folded
  into one issue since both bullets are one cohesive feature). Every one
  of these issues documents its assumed API shape in
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" as part of its DoD —
  not yet done in this commit, tracked as part of each issue's own work,
  not this roadmap update's.

  W5 (Payments UI) deliberately left unscoped: it depends on
  `docforum-core` Phase 5.5, which is itself unscoped pending
  `docforum-escrow` publishing its SDK — two layers of "no real contract
  to build against yet," so no issue was opened for it. All checklist
  items above updated to link to their issues.
- 2026-09-14 — Replaced the placeholder `.github/workflows/ci.yml`
  (`pull_request`-only, `echo "TODO"`, never once run — this repo's
  existing `deploy-pages.yml` was the only workflow that ever actually
  ran) with a real one: `typecheck` → `test` → `build`, on push to
  `main` and on PRs. Verified locally first (21/21 tests, typecheck, and
  build all pass) and confirmed green in Actions. Companion fix applied
  identically in `docforum-core` (issue #21) and, separately, already
  done in `docforum-escrow` — all three org repos now run their real
  checks in CI instead of a stub, done ahead of the `docforum-escrow`
  Drips Wave application so any repo a reviewer or contributor lands on
  looks actively maintained. No lint script exists in this repo's
  `package.json` yet, so this doesn't include one.
- 2026-09-15 — General workspace-audit fixes (applied identically across
  all three org repos, see `docforum-core`'s changelog for the full
  rationale): added `CONTRIBUTING.md` (human onboarding — `AGENTS.md` is
  agent-facing); enabled branch protection on `main` (real CI check +
  1 approval required to merge, force-push/deletion disabled,
  `enforce_admins` left `false` so the maintainer isn't blocked); added
  GitHub topics for discoverability.
- 2026-09-15 — Built Phase W5 (Payments UI) for real, now that
  `docforum-core`'s Phase 5.5 shipped: added `WalletLink`/`PaymentIntent`
  types to `src/types/models.ts` (real, mirroring `docforum-core`'s
  actual schema — not "assumed" like most of this repo's other types
  still are), `src/services/payments-service.ts`, and
  `src/features/payments/` (hooks + `WalletLinkForm`,
  `CreatePaymentIntentForm`, `PaymentIntentPanel`). Wired `WalletLinkForm`
  into `FacilityDashboardPage`; added a new `AdminDashboardPage` at
  `/admin` (new `admin`-role-gated route) driving the full
  create → fund → release/refund lifecycle. Every call goes through
  `docforum-core`'s API only — confirmed no Stellar/`@docforum/escrow-sdk`
  dependency was added here, holding hard rule 1. 6 new component tests
  (mocking `payments-service`, following this repo's existing
  `SignupForm.test.tsx` pattern) — 27/27 tests, typecheck, and build all
  pass. Not visually verified in a browser this session (still no
  browser tool available) — same disclosed gap as every other UI change
  in this repo's history; the actual end-to-end payment mechanics
  (fund/release/refund really moving testnet funds) are proven by
  `docforum-core`'s own live-testnet integration test, which this UI
  calls through unmodified endpoints.
