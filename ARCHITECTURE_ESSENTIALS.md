# ARCHITECTURE_ESSENTIALS.md — docforum-web

Frontend-only quick reference. Full product/system architecture lives in
`docforum-core`'s `ARCHITECTURE.md` and `ARCHITECTURE_ESSENTIALS.md` — read
those first if you're new to the org, not just this file.

## Stack
- React + TypeScript + Vite
- React Query for server state, Zustand for client-only UI state
- No localStorage/sessionStorage for anything server-derived — treat
  `docforum-core`'s API as the source of truth, always refetch/cache via
  React Query rather than hand-rolling persistence.

## Hard rules
1. **This repo never calls `docforum-escrow` or Stellar directly.** Wallet
   linking, payment status, escrow state — all of it comes from
   `docforum-core`'s API. If a screen needs Stellar-related data, that's a
   `docforum-core` API gap to file, not a reason to add a Stellar SDK
   dependency here.
2. Mirror `docforum-core`'s data model shapes in `src/types/models.ts` —
   don't invent parallel frontend-only shapes for the same entities.
3. Structure: `pages/ components/ features/ hooks/ services/ store/ types/`
   — keep this shape.

## Where things live
- `src/services/` — API client calls to `docforum-core`. `api-client.ts` is
  the only place fetch/base-URL/error-envelope details live.
- `src/features/` — flow-specific logic (booking, referral-accept, order
  fulfillment selection, etc.) — one feature folder per PRD core flow.
- `src/pages/` — route-level components.
- `src/store/` — Zustand stores. `auth-store.ts` is intentionally
  in-memory only (not persisted) — see hard rule about
  localStorage/sessionStorage above; it applies to auth tokens too, not
  just business data.

## Deployment
- GitHub Pages, deployed on every push to `main` via
  `.github/workflows/deploy-pages.yml`: https://docforum.github.io/docforum-web/
- **Connected to a live backend as of 2026-09-14** —
  `VITE_API_BASE_URL` is set at build time to `docforum-core`'s Render
  preview deployment (`https://docforum-core-api.onrender.com`, see that
  repo's `docs/adr/0003-render-preview-deployment.md`). Signup/login
  actually work end-to-end against a real Postgres now. Still a
  **preview**, not production: the free-tier backend spins down after 15
  minutes idle (~1 minute cold-start delay on the next request), and its
  Postgres expires 2026-10-14 unless renewed — data is disposable.
- Router is `HashRouter`, not `BrowserRouter` — GitHub Pages has no
  server-side rewrite for client-side routes, so a deep link like `/login`
  would 404 on refresh under history-API routing. Switch back to
  `BrowserRouter` if this ever deploys somewhere with a real rewrite rule
  (e.g. behind `docforum-core` itself, or Vercel/Netlify).
- `vite.config.ts`'s `base` is conditional on `GITHUB_PAGES=true` (set by
  `npm run build:pages`) — plain `npm run build` still serves from `/`.

## Known gaps against the real API (docforum-core Phase 1 landed 2026-09-14)
`docforum-core` now has a real, tested API — see its `docs/api/README.md`.
The original W1 assumptions here turned out correct (`POST /auth/signup`/
`login`/`logout`, `{ user, accessToken }`, `{ message: string }` error
envelope, `fullName` is a real column, `role` restricted to `patient`/
`doctor` at signup — server-enforced too, not just this UI).
`credentials: 'include'` is now set on the `fetch` call in
`api-client.ts` (fixed 2026-09-14, alongside the Render connection — the
real backend's refresh cookie is `SameSite=None; Secure`, cross-site
between this repo's `github.io` domain and Render's, so it's required for
the cookie to be sent/received at all). One gap remains:
- **`POST /auth/refresh` exists on the backend but nothing here calls
  it.** `auth-store.ts` still has no silent-reauth-on-reload flow — a
  page refresh loses the session even though the refresh cookie would
  still be valid. Tracked, not built (Phase W1 was scoped to
  signup/login only).
- Local-dev-only caveat inherited from the backend: its refresh cookie is
  `sameSite: 'lax'`/`secure: false`, which may not survive true
  cross-origin (different ports) `fetch` + `credentials: 'include'` in
  every browser — not verified end-to-end. See `docforum-core`'s
  `docs/api/README.md`.

## Known assumptions (assumed API contracts)
Assumed shapes for not-yet-merged `docforum-core` work. Each entry names
the backend issue it tracks — reconcile on sight once that issue merges.

- **Lab results viewer (this repo issue #24 → `docforum-core` #72,
  abnormal escalation + acknowledgement tracking, PRD §8.2.7).**
  `docforum-core`'s `LabResult` table today only has
  `id`/`resultFileUrl`/`summary`/`createdAt` (plus `TODO labOrderId`/
  `fulfillingFacilityId`) and its `lab-orders/routes` is still a
  placeholder — none of the below exists there yet.
  Assumed endpoints (patient-scoped, `Authorization: Bearer` like the
  rest of this repo's services):
  - `GET /lab-results/mine` → `LabResult[]` (most recent first)
  - `GET /lab-results/:id` → `LabResult`
  Assumed `LabResult` fields beyond the real columns (see
  `src/types/models.ts` — every assumed field is commented there):
  `labOrderId`, `testName` (denormalized from `LabOrder.testType`),
  `facilityId`, `facilityName` (denormalized), `status`
  (`'pending' | 'ready'`), `abnormalityFlag`
  (`'normal' | 'abnormal' | 'critical'`, set by the facility),
  `acknowledgementStatus`
  (`'not_required' | 'pending' | 'acknowledged' | 'escalated'`),
  `doctorNotifiedAt`, `acknowledgedAt`, `withheldPendingReview`.
  `withheldPendingReview` covers #72's open question ("decide whether
  critical results are held until a doctor acknowledges them"): when true
  the UI hides summary + file behind a "waiting for your doctor's review"
  notice, so both backend decisions render safely.
  File viewing is native-only (`<img loading="lazy">` for images, the
  browser's built-in viewer via `<iframe>` for PDFs, plain anchors for
  download) — no third-party viewer script is loaded from a CDN at
  runtime, so no new CSP source is needed. File kind is sniffed from the
  URL extension client-side (`kindForResultFileUrl`) because the real
  table has no content-type column; unknown types fall back to
  download-only. Doctor acknowledgement (`POST /lab-results/:id/
  acknowledge` in #72) is doctor-side only — this patient UI reads
  `acknowledgementStatus` but never calls it.

## Roadmap / status
See `ROADMAP.md` in this repo, and Phase 7 in `docforum-core`'s
`ROADMAP.md` for the original (pre-split) frontend phase this was carved
out of.
