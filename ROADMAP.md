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
