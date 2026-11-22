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
1. **This repo never calls Stellar RPC, Horizon, `docforum-escrow` or any
   contract directly.** The one exception is asking the user's wallet to
   sign a transaction XDR that `docforum-core` prepared, and returning the
   signed XDR to `docforum-core`. The frontend never builds, simulates or
   submits transactions, and never holds a private key. Wallet linking,
   payment status and escrow state otherwise come from `docforum-core`'s
   API. If a screen needs Stellar-related data, that is a `docforum-core`
   API gap to file, not a reason to add a Stellar SDK dependency here.
2. Mirror `docforum-core`'s data model shapes in `src/types/models.ts` (one
   file per feature under `src/types/models/`, re-exported from there) —
   don't invent parallel frontend-only shapes for the same entities.
3. Structure: `pages/ components/ features/ hooks/ services/ store/ types/`
   — keep this shape. `src/i18n/` was added in Phase W7 for locale-aware
   formatting and direction (issue #88); it is not a place for business
   logic.

## Where things live

- `src/services/` — API calls to `docforum-core`. `api-client.ts` is the only
  place fetch/base-URL/credentials/auth/error-envelope details live.
- `src/mocks/` — MSW mock API for `npm run dev:mock`. It is loaded only behind
  the development guard in `main.tsx`; CI checks that mock code is absent from
  production bundles.
- `src/features/` — flow-specific logic.
- `src/pages/` — route-level components. Their routes are declared in
  `src/routes/<area>.tsx` (public, patient, doctor, facility, admin), and nav
  entries in `src/navigation/<role>.ts`; `App.tsx` and `Layout.tsx` only
  compose them.
- `src/store/` — Zustand stores. Auth and acting-for state are in memory.
- `src/prerender/` — build-time prerendering for the public pages (issue
  #120). `entry-server.tsx` renders the real route table with an empty auth
  store; `html.ts` is pure HTML assembly/validation (head metadata, link
  rewriting, `#root` injection). `scripts/prerender.mjs` does the file I/O
  and fails the build on any validation problem. See "Public pages &
  prerendering" below.

## Query keys & cache invalidation (issue #122)
React Query caches everything this app fetches. Two files own the key
space, and no hook may invent its own string array:
- `src/query-keys.ts` — one typed factory per resource (`appointmentKeys`,
  `queueKeys`, `healthKeys`, `facilityKeys`, …). `<resource>.all` is that
  resource's invalidation root; every other key nests under it (enforced by
  `src/query-keys.test.ts`).
- `src/invalidations.ts` — the mutation → keys map. A mutation declares its
  blast radius once, as a `'<domain>.<action>'` entry built from those
  factories, and refreshes it with `invalidateFor(queryClient, '…', …vars)`.
  Hooks do not hand-write `queryClient.invalidateQueries({ queryKey })`
  arrays anymore.

Rules:
- **Profile scoping.** Any list the API scopes to a patient profile carries
  the acting profile id — `healthKeys.section(profileId, section)`,
  `careThreadKeys.list(profileId)`, `appointmentKeys.list(profileId)` — so
  switching profile in the acting-for switcher can never surface another
  profile's cache. `dependentKeys.all` is deliberately *not* profile-scoped:
  that list comes from `/patients/me`, keyed to the session, not a profile.
- **Narrowest key that is true.** A health write invalidates one profile's
  one section; an invite write invalidates a facility's invites, never its
  members or fulfillment queue. Widen a key only when the write provably
  moves the wider data — payment actions also invalidate
  `paymentKeys.ledgers()` because funding/releasing/refunding moves
  held/released totals that cannot be attributed to one facility from the
  intent alone.
- **Sibling flag keys (the documented exception).** `flagKeys.list()` and
  `flagKeys.history()` stay siblings: invalidating the list must not
  refetch the audit lookup, and vice versa. Only the write path uses
  `flagKeys.all`, which covers both.
- **No silent writes.** If a mutation moves data a screen reads, it has a
  map entry — including the optimistic paths (visit actions, intent
  actions) that previously left the visible list stale until a 30 s poll.
- `setQueryData` patches (optimistic rows, server responses written
  straight through) stay in the hook; the map governs *invalidation*.
  Whether `onSuccess` awaits the refetch is kept per-hook as it was before
  this issue — a "Saving…" state that used to release early still does.

No API shape is assumed by either file: they only name keys. Tests:
`src/query-keys.test.ts` (nesting, profile scoping, sibling/narrow keys)
and `src/invalidations.test.ts` (a seeded `QueryClient` per case asserting
exactly the targeted keys are invalidated and unrelated ones are not), plus
a hook-level case in `useQueue.test.tsx` — a confirmed start/complete marks
the dashboard appointment list and the queue for refresh, the analogue of
this issue's review check ("a booking mutation refreshes the dashboard and
appointment list") until booking (#2) and the patient appointment list (#3)
land and consume `appointmentKeys.list(profileId)`.

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

## Public pages & prerendering (issue #120)
- **One registry, many consumers.** `src/pages/public-routes.ts` is the
  single source of truth for public routes: path, title, description and
  heading per page, plus the canonical/sitemap/robots builders. The router
  (`src/pages/public-page-map.tsx` → `App.tsx`), the SSR entry, the
  prerender script and the client-side metadata hook all read it — never
  register a public route anywhere else.
- **Build-time prerender, no new dependencies.** `npm run build` and
  `npm run build:pages` run `npm run prerender` last: a Vite SSR build of
  `src/prerender/entry-server.tsx` (into `dist-ssr/`, gitignored) followed
  by `scripts/prerender.mjs`, which renders each public route to
  `dist/<route>/index.html`, writes `dist/sitemap.xml` and
  `dist/robots.txt`, and re-validates every page. A single problem fails
  the build — CI therefore exercises the whole pipeline without any change
  to `.github/workflows/`.
- **No authenticated code paths during prerender.** The SSR entry wraps
  `<App/>` in an empty auth store, so the logged-out `Layout` branch runs
  and nothing signed-in can render. `validatePrerenderedHtml` treats a
  leaked "Log out" control or a leftover `#app-loading` shell as a build
  error, and `check:dist` still guards against mock code.
- **Canonical origin is production, always.** `SITE_ORIGIN`
  (`https://docforum.github.io`, overridable for previews via
  `VITE_PUBLIC_SITE_ORIGIN`) and `SITE_BASE` (`/docforum-web/`) come from
  the registry, not from the build-time `base`. A local `npm run build`
  therefore emits production canonical URLs — that is deliberate, so what
  search engines would index is what ships.
- **Link rewriting.** Prerendered markup rewrites `href` values only:
  public routes become real, crawlable, base-prefixed paths
  (`/faq/` → `/docforum-web/faq/`) so crawlers and no-JS visitors can
  follow them; app-only routes become `{base}#/{route}` so clicking them
  boots the SPA; hrefs with a file extension and all `src`/`href` assets
  are left alone. On load, `restorePublicPathIntoHash()` (called in
  `main.tsx` before render) moves a path-based public URL into the
  `HashRouter` so the SPA takes over from the static page.
- **GSAP is progressive enhancement only.** Landing-page and logo
  animations must never hide content when they fail: wrap GSAP work in
  try/catch, strip primed inline styles on failure
  (`clearAnimationStyles()` in `HomePage`), and keep all copy in the DOM
  regardless. Regression-tested in `src/pages/HomePage.test.tsx`.
- **Content rules.** Public copy is PRD-sourced only. Facility accounts
  are described as admin-invited (PRD OQ-2), payouts as Stellar testnet
  (hard rule 1 — no escrow/Stellar SDK talk here). Privacy and
  Accessibility statements are marked "Draft — pending legal review" until
  real legal review happens; do not silently drop that flag. Disclosed
  third parties only (OpenStreetMap tiles; fonts are self-hosted since
  #101) — no analytics or ads, and no new ones without updating the copy
  in the same PR.
- **`vite.config.ts` test env:** happy-dom is configured with
  `disableCSSFileLoading`/`handleDisabledFileLoadingAsSuccess` because the
  prerender tests parse the real `index.html` template (via `?raw`),
  which links the self-hosted `/fonts/fonts.css` and
  `/loading-shell.css` — tests must never fetch them.

## API client behaviour (issue #123)
`src/services/api-client.ts` is the only place HTTP lives, and it now owns
the full request lifecycle — services pass options through, never wire
`fetch` themselves:

- **Timeouts.** Every request has a budget: `DEFAULT_TIMEOUT_MS` (60 s,
  deliberately longer than docforum-core's ~1 minute cold start so the
  `useSlowRequestHint` message at 4 s explains a wait that then *succeeds*
  instead of being killed mid-cold-start), or `SLOW_REQUEST_TIMEOUT_MS`
  (120 s) for the genuinely slow endpoints (`POST /patients/me/export`,
  its download, `POST /admin/jobs/:name/run`). Expiry rejects with a
  typed `ApiTimeoutError` — never silently, and never disguised as an
  `ApiError` (which always means "a response arrived").
- **Cancellation.** Every query-serving service function takes an optional
  trailing `AbortSignal`, and every `queryFn` passes React Query's signal
  (`queryFn: ({ signal }) => …`) — so a navigation/unmount stops the
  network call. A caller-initiated abort rejects with its abort reason;
  `isAbortError(error)` distinguishes it from real failures. The retry
  policy in `query-client.ts` never retries an abort, and any
  catch-all `catch` in a `queryFn` that degrades to placeholder data
  **must rethrow aborts/timeouts** first (`useCareThreads`,
  `useFacilityLedger` do) — resolving a cancelled query with fallback data
  caches data nobody asked for.
- **GET de-duplication.** Identical concurrent GETs (same URL, bearer
  token, timeout and parse mode) share one request and one parsed result.
  Cancellation is per caller: aborting one participant rejects only that
  participant; the shared request is aborted once its *last* caller
  leaves. **Mutations are never de-duplicated** — a POST must never be
  replayed as if the second caller's write had happened.
- **Retry policy.** `query-client.ts` retries transient failures once
  (`retry: 1` semantics kept) and never retries an abort. Per-hook
  `retry` overrides (e.g. no retry on a 404 "no wallet linked") still
  apply on top.

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
the cookie to be sent/received at all). Session restore on reload landed
2026-10-20 (issue #9):
- The boot refresh is `POST /auth/refresh` from `src/services/session.ts`,
  kicked off by `main.tsx` without blocking first render. The route guard
  loaders (`src/routes/guards.ts`, issue #112) wait while the store's `status` is
  `resolving`, instead of bouncing a signed-in user to `/login`.
- A `401` on an authenticated request triggers **one** refresh and one
  retry. Concurrent 401s share the same in-flight promise in
  `api-client.ts` (`refreshSession`), because docforum-core rotates the
  refresh cookie on every call.
- `docforum-core`'s Phase 8 CSRF contract means refresh/logout also need
  the per-session `csrfToken` in `X-CSRF-Token`. That is the only value
  persisted across reloads (first-party `docforum_csrf` cookie) — see
  "CSRF token storage" below. Access and refresh tokens remain in memory /
  the backend's httpOnly cookie.
- Local-dev-only caveat inherited from the backend: its refresh cookie is
  `sameSite: 'lax'`/`secure: false`, which may not survive true
  cross-origin (different ports) `fetch` + `credentials: 'include'` in
  every browser — not verified end-to-end. See `docforum-core`'s
  `docs/api/README.md`.

### CSRF token storage (issue #9, docforum-core Phase 8 #37)
`/auth/refresh` and `/auth/logout` are cookie-authenticated, so
docforum-core requires the session's `csrfToken` (returned in the
login/signup/refresh body) in `X-CSRF-Token`. On reload the in-memory copy
is gone; without persisting it, silent re-auth is impossible. The token is
therefore kept in a first-party `docforum_csrf` cookie (`csrf-storage.ts`),
never in localStorage/sessionStorage and never as the httpOnly refresh
token. It is not a credential on its own: the refresh cookie is still
required alongside it, and JS-readable CSRF tokens are the standard
double-submit pattern. The access token stays in memory; the refresh token
stays in docforum-core's httpOnly cookie.


## Known assumptions

### Phase W6 — Catalog management (issue #67; depends on docforum-core #23, #60, #69 and #70)

The `docforum-core` checkout and its `PRD.md`/`AGENTS.md` were not present
in the workspace when this UI was implemented. These endpoint and response
shapes are provisional and must be reconciled with those backend issues
before release:

- `GET /admin/catalogs/:catalog?search=&page=&pageSize=` →
  `{ items: CatalogItem[], total, page, pageSize }`, with catalog values
  `specialties`, `symptoms`, `medications`, `lab-tests`.
- `POST /admin/catalogs/:catalog` and `PATCH /admin/catalogs/:catalog/:id`
  accept `{ name, slug, description? }` and return `CatalogItem`.
- `GET /admin/catalogs/:catalog/:id/usage` → `{ usageCount }`;
  `POST /admin/catalogs/:catalog/:id/retire` retires without deletion and
  returns the updated `CatalogItem`.
- `GET /admin/catalogs/symptoms/:symptomId/specialties` →
  `SymptomSpecialtyMapping[]`; `PUT` to the same route accepts
  `{ mappings: { specialtyId, weight }[] }`.
- `CatalogItem` is provisionally `{ id, name, slug, description?, active,
  usageCount, createdAt, updatedAt }`; weights are assumed to be numeric
  values from 0 to 1. Existing records retain backend snapshots after
  retirement. Slug edits can break links and are warned about in the form.
- **Multi-tab session sync (issue #124)**: `BroadcastChannel` carries logout and acting-for profile changes only; it never carries access tokens or user data. Browsers without `BroadcastChannel` retain normal single-tab behavior. Refresh signaling/single-flight is deferred until issue #9 implements `POST /auth/refresh`.

### Patient wallet linking (issue #58)

The patient-wallet flow is intentionally not implemented against an assumed
API. The required `docforum-core` SEP-10 challenge/verify contract and
patient-scoped verified wallet-link contract are tracked in
[`docforum-core#77`](https://github.com/DocForum/docforum-core/issues/77) and
[`docforum-core#78`](https://github.com/DocForum/docforum-core/issues/78),
respectively. Until those contracts land, this repository must not invent
endpoint paths, request/response shapes, a privacy-notice source, or wallet
verification semantics. The boundary check in
`scripts/check-stellar-boundary.mjs` guards the direct-network prohibition
while that work remains outstanding.

- **W7 browser suites (#91–#94)**: Playwright uses the existing `src/mocks/`
  browser handlers and `example.test` fixtures. No new API shape is assumed.
  Fraunces and IBM Plex Sans are served locally so visual baselines do not
  depend on a third-party font response at test time.
  Patient doctor search/booking/intake/appointments and doctor order issuance
  screens are absent, so their browser journeys remain uncovered until those
  routes exist. The existing mock payment intent uses the provisional W5
  contract already documented below. Browser MSW startup is awaited before
  the first React render to avoid an unmocked request race.

- **Platform theming & preference storage**: Theme preferences (`light`, `dark`, or `high-contrast`) are saved in `localStorage` under the key `docforum-theme`. If no explicit choice is stored, the UI automatically falls back to system media queries (`prefers-color-scheme: dark` and `prefers-contrast: high`). A pre-hydration inline script in `index.html` inspects this state immediately to set the `data-theme` attribute on `<html>`, preventing pre-hydration white flash on load.

### Phase W5 — Pay with wallet (issue #59)

The flow is built against assumed contracts — docforum-core#80 (prepare) and
#81 (submit) describe both endpoints but haven't landed. Real today:
`PaymentIntent` and its status machine (custodial v1, core ADR 0004), the
explorer helper (`features/payments/explorer.ts`), and the boundary itself —
the browser only relays XDR (hard rule 1, enforced by
`scripts/check-stellar-boundary.mjs`: no SDK imports, no network URLs).

- `POST /payments/intents/:id/prepare` (patient, own intent) →
  `PreparedTransaction` = `{intentId, xdr, expiresAt, expiryLedger: number |
  null, status}`. Moves the intent to the **assumed** `awaiting_signature`
  status (added to `PaymentIntentStatus` in `models.ts`). `409` with code
  `WALLET_NOT_LINKED` (error envelope `code` field is assumed — the current
  envelope is `{message}` only) renders an explanatory, non-error state.
- `POST /payments/intents/:id/submit` (body `{signedXdr}`) → the updated
  `PaymentIntent`. A `410`/expired-preparation code is the **normal** expired
  branch (one-tap re-prepare, same panel, no navigation). #81 documents a
  failure path that returns the intent to `created` — the confirm poll reads
  that as "did not go through".
- The order→intent lookup is issue #61's assumed contract
  (`getPaymentIntentForOrder`, pending docforum-core#85): one lookup serves
  the status panel and this flow, so there is no second shape to keep in
  step. A `404` means "no intent for this order" — the panel stays hidden.
- **Polling:** after submit, the real `GET /payments/intents/:id` is polled
  every second while `confirming`, capped at 30 s with an honest "not
  confirmed yet" state; only reads that land *after* submission count (a
  cached status from an earlier attempt can't resolve a new one).
- **Wallet access** is the smallest default while #58 (wallet connection) is
  parked on core#77/#78: `features/payments/wallet.ts` duck-types an injected
  extension — `window.freighterApi`, or a generic `window.stellarWallet`
  exposing `{getAddress | getPublicKey, signTransaction}`. No wallet package
  is imported and the browser contacts no Stellar network; a wallet-kit
  integration later replaces the detection only. A refusal is detected from
  the thrown message and treated as a normal outcome (back to the start, no
  error styling).
- **Feature flag:** `VITE_PAY_WITH_WALLET === 'true'` at build time, default
  **off** (ADR 0005: "an option, not the default"). Flag off ⇒ the order card
  renders no payment panel and makes no payment request at all.
- Expiry is checked locally against `expiresAt` before signing and before
  submitting, so a patient who takes too long to approve never sends a dead
  transaction.
- Dev/mocks: `src/mocks/handlers/payments.ts` serves the order lookup
  (`pin-demo-2`, a `created` intent on the seeded lab order), prepare and
  submit; the confirm state lands on a mock explorer link.

### Session idle timeout — shared devices (issue #82)

Clinic computers and family tablets are shared, so a configurable idle
timeout (warning, then automatic sign-out) is the control. Everything
below is ASSUMED — docforum-core has no session-timeout endpoint; this
shape is worth mirroring in an issue there.

- `GET /auth/session-timeout` (authenticated) → `SessionTimeoutSettings`
  = `{idleTimeoutMinutes, warningSeconds}` — the backend knows the
  session's role and is expected to return its per-role value. A valid
  backend value takes precedence over the frontend defaults; a `404`
  (not implemented yet) or any malformed/out-of-range value (rejected by
  `sanitizeSessionTimeoutSettings`) falls back to the frontend role-based
  defaults in `src/hooks/idle-timeout.ts` (patient 30 min, doctor and
  facility 15 min, admin 10 min; 60–90 s warning).
- Frontend behaviour (`src/hooks/useIdleTimeout.ts`,
  `src/components/SessionTimeoutController.tsx`, mounted in `Layout`):
  timestamp-based checks (`now − lastActivityAt`), never
  interval-counting — throttled background tabs still compute the
  correct state, however late the check runs. Activity = pointer,
  keyboard, touch and wheel input, window focus, and tab visibility.
  Cross-tab: activity is broadcast on
  `BroadcastChannel('docforum-idle-activity')` and the newest timestamp
  wins, so typing in one tab keeps the others alive (broadcasts
  throttled to 1 per 2 s).
- On timeout: best-effort `POST /auth/logout`, then ALL client state is
  cleared (React Query cache, profile/acting-for store,
  unsaved-changes registry, auth session) and the user lands on
  `/login?reason=idle-timeout`. The login page shows its explanation
  when EITHER the query param is present OR the in-memory
  `auth-store.signOutReason` says `idle-timeout` — a route guard's
  redirect (e.g. `RoleGate` on the page being left) can win the
  navigation race and strip the query param, and the reason must not be
  lost with it. `setSession` clears the in-memory reason.
- The warning modal (`SessionTimeoutWarning`) says when unsaved form
  data will be lost; forms opt in via `useUnsavedChangesWarning(isDirty)`
  (wired into the health-profile editor as the first adopter).

### Phase W2 — Patient core flow (dependents, health profile, acting-for)

These API shapes are assumed and not yet implemented in `docforum-core`.
Reconcile against the real contract once the corresponding backend issues
land.

#### Dependents (docforum-core#42)
- `GET /patients/me/dependents` → `Dependent[]`
- `POST /patients/me/dependents` (body: `{fullName, dateOfBirth, relationship}`) → `Dependent`
- `PATCH /patients/me/dependents/:id` (body: `{fullName, dateOfBirth, relationship}`) → `Dependent`
- `POST /patients/me/dependents/:id/handover-invite` (body: `{email}`) → `Dependent`
- `POST /patients/me/dependents/:id/handover-invite/resend` → `Dependent`
- `POST /auth/claim-account` (body: `{token, email, password}`) → `void`
- `Dependent` shape: `{id, guardianProfileId, fullName, dateOfBirth, relationship: 'parent'|'guardian'|'carer', handoverStatus: 'not_eligible'|'eligible'|'invited'|'claimed', claimEmail?, claimInviteExpiresAt?, createdAt, updatedAt}`

#### Health profile (docforum-core#59)
- `GET /patients/:profileId/health/:section` → `HealthEntry[]`
- `POST /patients/:profileId/health` (body: `{section, name, details?}`) → `HealthEntry`
- `PATCH /patients/:profileId/health/:entryId` (body: `{name, details?}`) → `HealthEntry`
- `DELETE /patients/:profileId/health/:entryId` → `void`
- `HealthEntry` shape: `{id, patientProfileId, section: 'allergies'|'conditions'|'medications', name, details?, version, previousValue?, updatedAt, createdAt}`

#### Acting-for profile switcher (#20)
No new backend endpoint. The switcher is client-only UI state (Zustand
store). Every patient API call and React Query key includes the selected
`patientProfileId` so caches never mix profiles.

#### Data export (docforum-core#40, issue #26; real API since #259)
- `POST /patients/me/export` (no body) → `202 DataExport` plus `Location: /patients/me/export/:id`; returns an existing pending/processing export instead of queuing a second one.
- `GET /patients/me/export/:id` → `DataExport` (`404` for an id that is not the caller's, the same as an unknown one).
- `GET /patients/me/export/:id/download` → file stream (`application/json`); `409 EXPORT_NOT_READY`, `410 EXPORT_EXPIRED`.
- `DataExport` shape: `{id, status: 'pending'|'processing'|'ready'|'expired'|'failed', schemaVersion, createdAt, startedAt?, generatedAt?, expiresAt?, sizeBytes?, failure?: {code, section?}, downloadUrl?}`; there is no list endpoint, so the client keeps the id in memory/query cache only and says so after a reload.
- Ready exports expire after 24 hours. Downloads require bearer authorization and avoid keeping export contents in memory or in the query cache.

#### Account deletion (docforum-core#41, issue #27; real API since #260)
- `DELETE /patients/me` (body: `{password}`) → `204 No Content`. A wrong password is `403 PASSWORD_CONFIRMATION_FAILED`. The typed `DELETE` phrase is a client-side check only.
- Clinical and statutory retention: identity credentials (name, email, password hashes, guardian links) are permanently scrubbed/anonymized. Clinical consultation notes, diagnostic orders, and cryptographic payment/escrow records are retained by law in de-identified form.
- Guardians may delete their account: core revokes every guardianship and keeps dependents' profiles and appointments. Deletion is otherwise not blocked on the client.
- Client clears all QueryClient cache and Zustand session/profile state, then redirects to `/account-deleted`.

#### Confirm receipt or report problem (issue #35)
- Fulfilled orders include a `confirmationWindow` field with `deadlineAt` and `inactionConsequence`.
- `POST /orders/confirm-receipt` (body: `{orderId, expectedUpdatedAt}`) → `ConfirmReceiptResponse`
- `POST /orders/report-problem` (body: `{orderId, reason, description, expectedUpdatedAt}`) → `ReportProblemResponse`
- `OrderConfirmationWindow` shape: `{deadlineAt: string, inactionConsequence: 'auto_confirm'|'escrow_held'|'refund_pending'}`
- `ConfirmReceiptResponse` shape: `{orderId, status, confirmedAt, updatedAt}`
- `ReportProblemResponse` shape: `{disputeId, orderId, status, submittedAt, updatedAt}`
- Duplicate submissions are prevented via `expectedUpdatedAt` conflict detection (409).
- The confirmation window deadline is shown in plain language with the inaction consequence explained without technical jargon.

#### Closure calendar management (not yet tracked as an issue)
- Admins can create and edit closures with a preview of affected booked appointments before saving.
- After saving, an affected-appointments report shows links to contact patients inside the closure period.
- All-day closures respect the correct time zone.
- Deleting a closure doesn't recreate removed slots — a notice explains this to the admin.
- Closures can be platform-wide or scoped to a specific facility.
- Admins can create and edit closures with a preview of affected booked appointments before saving.
- After saving, an affected-appointments report shows links to contact patients inside the closure period.
- All-day closures respect the correct time zone.
- Deleting a closure doesn't recreate removed slots — a notice explains this to the admin.
- Closures can be platform-wide or scoped to a specific facility.

#### Care thread timeline (issue #28)
- `GET /patients/:patientProfileId/care-threads` → `CareThread[]`
- `GET /care-threads/:id` → `CareThread`
- Aggregates appointments, consultations, referrals, orders, fulfillment, and escrow payment settlement into a single continuous journey timeline.
- Progressive rendering and graceful degradation when modules are not yet implemented.

#### Facility finder with distance sorting (docforum-core#74, issue #29)
- `GET /facilities?type=&lat=&lng=&query=` → `FacilityWithDistance[]`
- OpenStreetMap tiles with attribution.
- Patient location is requested with transparent consent, kept strictly in transient memory, and NEVER persisted to storage or URLs.

#### Doctor search & symptom-based search (issues #1/#30; docforum-core#23 and #60 not landed)
- `GET /symptoms?q=<text>&limit=<n>` → `SymptomSuggestion[]` — autocomplete against a curated, backend-owned symptom vocabulary (substring match, case-insensitive). `SymptomSuggestion` = `{slug, term}`. Free text never reaches the doctor-search endpoint — the patient picks a vocabulary entry (docforum-core#60: controlled vocabulary, no ML). The UI debounces typing (250 ms) and cancels superseded in-flight requests.
- `GET /symptoms/:slug` → `SymptomSpecialtyMapping` = `{slug, term, specialties: Specialty[]}` — which specialties treat the symptom. `404` for a slug that has left the vocabulary; the UI explains this and offers to clear rather than showing a generic error.
- `GET /doctors?specialtyIds=<id,id>&availability=<week|today>` → `DoctorSearchResult[]` — doctors practising in ANY of the listed specialties (a symptom can map to several), soonest `nextAvailableAt` first, verified doctors only. Omitting `availability` (the UI's `any` value) means no availability filtering; `week` = an open slot within 7 days, `today` = an open slot within the patient's current day (the mock approximates it as the next 24 h). `DoctorSearchResult` deliberately reuses the `DoctorAvailability` shape (`{id, fullName, verificationStatus, specialties, openSlotCount, nextAvailableAt}`) — same entity, one shape (hard rule 2).
- Frontend behaviour: the applied symptom slug and the availability filter live in the URL (`?symptom=<slug>&availability=week`); invalid URL values are dropped with a visible notice, never sent to the backend. No symptom applied ⇒ no doctor request is fired (an unfiltered "every doctor" request doesn't exist), and a no-match result always offers a concrete way forward (widen availability, try another symptom).

#### Orders list and facility selection (docforum-core#11/#14, issue #5)
- `GET /orders/mine` → `PatientOrder[]` — every version of the patient's prescriptions and lab orders, not only the current one. `PatientOrder` is a discriminated union on `orderType`:
  - prescription: `{id, patientProfileId, orderType: 'prescription', version, supersedesId, status, issuedAt, issuedByDoctorName?, requiresFacilitySelection, selectedFacility?, medication, dose, quantity?, instructions?}`
  - lab order: `{id, patientProfileId, orderType: 'lab_order', version, supersedesId, status, issuedAt, issuedByDoctorName?, requiresFacilitySelection, selectedFacility?, testName, fastingRequired?, instructions?}`
  - `status` is `active | completed | cancelled | superseded`; `selectedFacility` is `{id, name, type, isOpen?}`.
- The current version is derived client-side from the supersedes chain (`features/orders/current-orders.ts`), never from array order: the terminal record (no other record supersedes it) with the highest `version` wins, and earlier versions remain visible as history. This deliberately works even if the API returns versions out of order.
- `GET /orders/:orderId/qualified-facilities` → `QualifiedOrderFacility[]` = `{id, userId, name, type, isOpen, capabilities, location?}`. The backend's capability matching (docforum-core#14) is the only source of this list; the UI never infers eligibility from facility type.
- `POST /orders/:orderId/fulfillment-facility` (body: `{facilityId, expectedVersion}`) → the updated `PatientOrder`. `expectedVersion` lets docforum-core answer `409` if the order changed while the patient was choosing; the UI then asks the patient to reload rather than silently overwriting a correction.

### Phase W3 — Doctor core flow (confirmed appointment APIs; other contracts assumed)

These shapes back issues #6, #7 and #45–#49. The appointment list and visit
start/complete endpoints below match docforum-core's API. Intake, queue
position, check-in, running-delay and the consultation/message contracts
remain assumptions pending docforum-core issues #129 and #61 and the
consultation contracts.

#### Today's appointments & live queue (issues #6 and #49)
- `GET /appointments/doctor/today` → `Appointment[]` — today's appointments for the signed-in doctor, ordered by `startsAt`.
- `GET /appointments/:id/intake` → `IntakeForm | null` — assumed endpoint for the structured intake the patient submitted for that appointment. `404` means no intake was submitted; the UI shows that as an empty state, not an error. The endpoint is doctor-scoped: it must only return intake for appointments assigned to the signed-in doctor.
- `IntakeForm` shape: `{id, appointmentId, patientProfileId, submittedAt, chiefComplaint, symptomDuration?, severity?: number|null (0–10), currentMedications: string[], allergies: string[], notes?}`.
- `GET /doctor/queue/today` → `QueueEntry[]` — assumed endpoint for checked-in patients in queue order (computed server-side from `checkInAt`).
- `PATCH /appointments/:appointmentId/start` → `Appointment` — marks a checked-in visit `in_progress` (sets `startedAt`); a `409` means it is no longer scheduled or checked in.
- `PATCH /appointments/:appointmentId/complete` → `Appointment` — marks an in-progress visit `completed` (sets `completedAt`); a `409` means it is no longer in progress.
- `GET /doctor/queue/running-delay` → `RunningDelay` — computed delay from the current in-progress visit vs its scheduled end, plus any manual override.
- `PATCH /doctor/queue/running-delay` (body: `{manualOverrideMin?: number | null}`) → `RunningDelay` — set/clear a manual "running late by X min" override.

Undo behaviour: start/complete are applied optimistically and the write is deferred for exactly four seconds. Undo within that window cancels the write and restores the previous status; after it expires, undo does nothing. A `409` rolls back the optimistic status and invalidates the appointment list and queue.

#### Doctor messages inbox (issue #47)
- `GET /doctor/messages/threads?filter=&cursor=&limit=` → `{threads: MessageThread[], nextCursor?: string | null}` — threads with unread counts, last-message preview (PHI — kept short), waiting time, oldest unanswered first by default.
- `POST /message-threads/:id/read` → `{}` — mark a thread read (clears its unread count).
- Header badge reads total unread = sum of `unreadCount` across threads.

#### Consultation notes sign-off & addenda (issue #45, depends on #7)
- `GET /consultation-notes/:appointmentId` → `ConsultationNote`
- `POST /consultation-notes/:id/sign-off` → `ConsultationNote` — sets `signedAt`/`signedBy`; note becomes immutable after this.
- `POST /consultation-notes/:id/addenda` (body: `{content}`) → `ConsultationAddendum` — append-only; no edit/delete UI for addenda.
- Auto sign-off deadline, if present, is exposed as `autoSignOffAt` on the note.

#### Consultation outcome, referral & order issuance (issue #7)
- `POST /appointments/:appointmentId/consultation` (body: `{notes, outcome: 'resolved'|'referred'|'follow_up_needed', followUpAfterDays?}`) → `ConsultationRecord`. The consultation record is the doctor's outcome decision and is distinct from the sign-off note above. `followUpAfterDays` is required for `follow_up_needed` (whole number, 1–90) and must be `null` otherwise.
- `POST /consultations/:id/referrals` (body: `{targetSpecialty, reason}`) → `ConsultationReferral` — created only when the outcome is `referred`; specialty and reason are required. `status` reuses `ReferralStatus` and starts as `pending`.
- `POST /consultations/:id/orders` (body: `{orderType: 'prescription', medication, dose, instructions?}` or `{orderType: 'lab_order', testName, instructions?}`) → `ConsultationIssuedOrder` — optional single order issued with the consultation.
- Submission is sequential: record the consultation first, then create the referral/order using the returned consultation id. If a follow-up call fails, the UI keeps the recorded consultation, shows a partial-success error, and never silently retries the record (avoiding duplicates).
- The outcome panel reuses the note editor's current draft as `notes`, so the doctor writes the consultation note once. All three endpoints are assumed until docforum-core lands the consultation contract.

#### Doctor practice insights (issue #50, depends on docforum-core#124)
- `GET /doctor/insights?preset=&startDate=&endDate=` → `DoctorPracticeInsights`
- Scoped strictly to the authenticated doctor's own practice data; peer-comparison suppression guarantees no benchmarking against other named doctors.
- Aggregates weekly slot utilisation (offered vs booked), no-show and late-cancellation rates, referral acceptance turnaround (average, median, distribution), and message response time (within 2h/24h).
- Small-sample caveats (`sampleSizeWarning: true`) automatically flagged when denominators are low (total slots < 10, referrals < 5, message threads < 5) to warn against misleading rate volatility.
- Every chart view has a full accessible `<table>` alternative with semantic captions, headers, and tabular numeric alignment.

### Phase W4 — Facility staff accounts & fulfillment attribution (issue #51, docforum-core#75)
- `GET /facilities/:facilityId/members` → `FacilityMember[]` — facility staff and owners.
- `GET /facilities/:facilityId/invites` → `FacilityInvite[]` — pending invitations (owner-only access; hidden for staff).
- `POST /facilities/:facilityId/invites` (body: `{email, role: 'owner'|'staff'}`) → `FacilityInvite` — invite staff by email (owner-only).
- `POST /facilities/:facilityId/invites/:inviteId/resend` → `FacilityInvite` — resend invitation email (owner-only).
- `DELETE /facilities/:facilityId/invites/:inviteId` → `{success: boolean}` — revoke invite (owner-only).
- `DELETE /facilities/:facilityId/members/:memberId` → `RemoveMemberResponse` — remove member and immediately invalidate/revoke their active backend sessions (owner-only; cannot remove the last owner of a facility).
- Non-owner staff users see the team page in read-only mode (invite, revoke, and remove actions are hidden and rejected if forced).
- `GET /facilities/:facilityId/fulfillment-queue` → `FulfillmentQueueItem[]` — queue items with action attribution (`attribution: { action, performedByUserId, performedByName, performedByRole, timestamp, notes }`).
- `POST /facilities/:facilityId/fulfillment-queue/:itemId/action` (body: `{action: 'in_progress' | 'fulfilled' | 'rejected', notes?}`) → `FulfillmentQueueItem` — records the acting staff user's identity and role for PRD §7 audit trail. Closed items (`fulfilled`/`rejected`) reject further transitions with `409`; `in_progress` maps to attribution action `verified`.
- `POST /facilities/:facilityId/fulfillment-queue/:itemId/lab-result` (multipart form, field `file`) → `FulfillmentQueueItem` — real file upload for lab orders, not a URL field. Client accepts PDF/JPEG/PNG up to 10 MB; the server stores the object and returns an opaque `labResult` descriptor (`fileName`, `mimeType`, `sizeBytes`, `uploadedAt`, `uploadedByUserId`, optional `storageKey`/`downloadUrl`). The UI renders a server-signed `downloadUrl` when present and never constructs a provider URL itself. The object-storage provider and the exact upload contract are still undecided in docforum-core#16, so only the multipart transport is assumed here; do not add S3/GCS-specific request fields until #16 lands.
- **`FulfillmentRecord` caveat:** docforum-core#13's ADR has not decided between a single `FulfillmentRecord` table and split order/fulfillment tables. `FulfillmentQueueItem` is a UI projection, not that backend model, and may need remapping once the ADR lands. `FulfillmentLabResult` is likewise provisional and should be revisited with the same ADR.
- **Facility identity:** the auth payload does not expose a facility id yet (docforum-core#14), so the dashboard still uses an interim `fac-main` constant. Replace it with the facility context returned by the backend when account provisioning lands.
- No hardcoded queue fallback: loading, empty, and error states are distinct, and mutation failures surface in a banner rather than mutating local demo data.

### Phase W4 — Partial fulfilment (issue #54, depends on docforum-core#73)
These shapes are **assumed** until `docforum-core#73` lands. All calls still go through `docforum-core` (hard rule 1). The UI never computes escrow releases; it renders `payment.rule` verbatim.

- `GET /orders/mine` → `PatientOrder[]` and `GET /orders/:orderId` → `PatientOrder` — patient-scoped list/detail with item-level rows.
- `OrderItem` mirrors: `{id, orderId, name, instructions?, quantityPrescribed, quantityDispensed, quantityOutstanding, unit, status: 'pending'|'partially_dispensed'|'dispensed'|'dispensed_elsewhere'|'rejected', dispensedByFacilityId?, dispensedByFacilityName?, dispensedAt?, routedToFacilityId?, routedToFacilityName?, canDispense, blockedReason?}`.
- `PatientOrder.fulfillmentStatus` is derived by the backend from item rows: `unfulfilled` | `partially_fulfilled` | `fulfilled` | `rejected`. The frontend also has a defensive derivation helper for queue rows.
- `GET /orders/:orderId/remaining-items/facilities?itemIds=<csv>` → `FacilityWithDistance[]` — facilities qualified for **only** the outstanding items, excluding the order's current facility.
- `POST /orders/:orderId/route-remaining` (body: `{facilityId, itemIds}`) → `PatientOrder` — routes outstanding quantities to a second facility; the destination gets its own fulfillment queue rows. A `409` means another facility already dispensed (or another client already routed) an item.
- `POST /facilities/:facilityId/fulfillment-queue/:itemId/dispense` (body: `{quantity}`) → `FulfillmentQueueItem` — item-level partial dispensing. The backend owns quantity validation (whole numbers, ≤ outstanding) and must return `409` for dispensed-elsewhere/already-routed items. Queue items may carry `orderItemId` to link the facility row back to the patient's order item.
- `OrderPaymentSummary` (assumed): `{status: 'held'|'partially_released'|'released'|'refunded'|'none', heldStroops, releasedStroops, refundedStroops, rule}`. `rule` is plain language from the backend; the patient/facility UIs explain assumptions but do not decide release amounts (pending #73).

### Phase W6 — Admin audit & access log viewer (issue #71)

#### State-change events — real, docforum-core#43 (see its `docs/api/README.md` "Audit trail")
- `GET /admin/audit-events?entityType=&entityId=&actorUserId=&from=&to=&limit=&cursor=` → `{items: AuditEvent[], nextCursor: string | null}`, newest first, keyset-paginated on `(createdAt, id)`.
- `entityId` is only accepted together with `entityType`; `from`/`to` are inclusive ISO dates; `limit` is 1–200 (this UI sends 50). Unknown parameters are `400`; a malformed cursor is `400 INVALID_CURSOR` (the UI offers "Back to newest").
- `AuditEvent` shape: `{id, actorUserId, actorRole, entityType, entityId, action, fromState, toState, requestId, metadata, createdAt}`, mirrored in `models.ts`. `metadata` never holds personal data (server-enforced).
- **API gap:** there is no `action` filter. Because unknown parameters are `400`, the viewer filters by action client-side, within the loaded page only, and says so on screen. Worth a `docforum-core` issue to add server-side `action` filtering.

#### PHI access logs — assumed, docforum-core#45 not landed
- `GET /admin/access-logs` with the **same** query parameters and `{items, nextCursor}` envelope as audit events (#45 itself only specifies `?entityId=`).
- `AccessLog` shape: `{id, actorUserId, actorRole, entityType, entityId, route, createdAt}`. `actorRole` is assumed so the column matches the events tab.
- A `404` is shown as "docforum-core doesn't serve access logs yet" rather than a generic error.

#### Frontend behaviour
- Filters, tab and cursor live in the URL query (`tab`, `entityType`, `entityId`, `actor`, `action`, `from`, `to`, `cursor`); values from the URL are validated (charset, length, real calendar dates, `from ≤ to`) and invalid ones are dropped with a visible notice.
- Entity links: only `PaymentIntent` has an admin-reachable view (`/admin?intent=<id>`). Appointment and doctor-profile ids render as plain text until admin views exist.
- CSV export is client-side and covers exactly the rows on screen; cells starting with `= + - @` are prefixed with `'` to defuse spreadsheet formulas.

### Phase W6 — Stuck referrals console (issue #72, depends on docforum-core#68 and #65)

docforum-core#68 names the three endpoints but not their shapes, and its
`Referral` model is still field-sparse in `schema.prisma`. Everything below
is assumed; `ReferralStatus` and `Specialty` are the only real types, and the
`Referral` fields follow docforum-core's `ARCHITECTURE.md` §4.4 plus
`parentReferralId` from #65.

- `GET /admin/referrals?status=pending&olderThan=<24h|48h|72h|168h>&cursor=` → `{items: StuckReferral[], nextCursor}`, oldest first (the console re-sorts the loaded pages by `createdAt` anyway). `olderThan` is the only filter sent; the reason filter is client-side over loaded pages, because #68 doesn't define one.
- `StuckReferral` = `Referral` (without `snapshotNotes`, which is encrypted clinical text the console never needs) plus `stuckReason: 'no_doctor'|'doctor_inactive'|'loop_flagged'`, embedded `targetSpecialty: Specialty`, `referringDoctor`/`targetDoctor` as `{id, fullName}`, and `chain: ReferralChainLink[] | null`, sent only for `loop_flagged`, oldest hop first, ending with the referral itself. `ReferralChainLink` = `{referralId, referringDoctor, targetSpecialty, targetDoctor, status, createdAt}`. No patient name or id is shown.
- `GET /admin/doctors?specialtyId=&verificationStatus=verified` → `DoctorAvailability[]` = `{id, fullName, verificationStatus, specialties: Specialty[], openSlotCount, nextAvailableAt}` (open slots in the next 7 days).
- `POST /admin/referrals/:id/reassign` (body: `{targetDoctorId, reason, expectedUpdatedAt}`) → `Referral`.
- `POST /admin/referrals/:id/cancel` (body: `{reason, expectedUpdatedAt}`) → `Referral`. docforum-core notifies the patient; the client doesn't. Cancellation's resulting status isn't assumed: `ReferralStatus` has no `cancelled` value yet, and the referral just leaves the queue.
- **Conflicts:** `expectedUpdatedAt` is the referral's `updatedAt` as the admin saw it, so docforum-core can answer `409` when someone else acted first. `409` and `404` close the dialog, explain, and refetch the queue. `400`/`422` keep the dialog open with the server's message (`422` also refetches the doctor list). A network failure keeps the dialog open; retrying is safe because a duplicate comes back as `409`.
- **Eligibility is enforced client-side as well:** the picker only offers doctors that are `verified`, list the referral's `targetSpecialtyId`, and are neither the referral's current target doctor nor its referring doctor (`eligibleCandidates`). Anything else docforum-core returns is hidden, and the picker says how many were hidden. Verification is per doctor today; when per-specialty verification lands (docforum-core#51), `DoctorAvailability` needs a per-specialty status and the check should use it.
- Reasons are required, 10–500 characters, with whitespace collapsed. The UI asks admins to keep clinical details out, because reasons land in the audit trail. After an action, the console links to `/admin/audit?entityType=Referral&entityId=<id>`, which assumes the referral audit events use `entityType: 'Referral'`.
- `404` on the queue or doctor listing is shown as "docforum-core doesn't serve this yet (#68)".

### Phase W6 — System health page (issue #73, depends on docforum-core#100, #104 and #94)

None of the three backend issues has landed (docforum-core still serves only
`GET /health` → `{status: 'ok'}`), so every shape below is assumed and
mirrored in `models.ts` under "Phase W6 — System health".

- **Readiness (docforum-core#104):** `GET /health/ready` → `ReadinessReport` = `{status: 'ready'|'degraded'|'not_ready', checkedAt, checks: ReadinessCheck[]}`, `ReadinessCheck` = `{name, status: 'pass'|'warn'|'fail', required, durationMs, message}`. Check names assumed: `database`, `migrations`, `config`, `stellar_rpc`; any other name is shown as sent. `200` for ready/degraded, `503` for not ready **with the same body**; the service unwraps a `503` only if its body looks like a report, so a proxy's 503 page still counts as unreachable. `degraded` means only optional checks are failing; #104 says a Stellar RPC outage should take out payments, not the whole API. The bearer token is sent in case docforum-core only shows check detail to admins. `message` is assumed never to hold secrets (server-side responsibility); the UI renders it as text.
- **Jobs (docforum-core#100):** `GET /admin/jobs` → `BackgroundJob[]` = `{name, schedule, lastRun, lastSuccess, lastFailure, nextRunAt, running}`, where each run is a `JobRun` mirroring #100's table: `{id, job, status: 'running'|'succeeded'|'failed', startedAt, finishedAt, error, itemsProcessed, trigger: 'schedule'|'manual'}`. `schedule` is assumed to be human-readable (an interval phrase or a cron expression), shown verbatim. `running` means some instance holds the job's advisory lock.
- **Run now:** `POST /admin/jobs/:name/run` → `JobRun`, which may still be `running` if the job outlives the request. `409` means another instance holds the lock (no second run); `404` means an unknown job or manual runs aren't served yet. Every outcome, network failures included, refetches all three sources. Retrying after an unconfirmed run is safe because #100 requires jobs to be idempotent.
- **Recent failures:** #100 describes no run-history listing, so the page builds this list from each job's `lastFailure` within the last 24 hours (at most one per job). A `GET /admin/jobs/runs?status=failed` would show more; worth a `docforum-core` issue if admins need it.
- **Outbox (docforum-core#94):** `GET /admin/outbox` → `OutboxSummary` = `{pendingCount, deadLetterCount, oldestPendingAt}`. The issue asks for the dead-letter count "if exposed", so a `404` shows "Not exposed" (neutral), not an error.
- **Derived states, all client-side:** a job is *overdue* once `nextRunAt` is more than 5 minutes past (this is how a stalled expiry job shows up); *running* beats *last run failed*, which beats *overdue*, which beats *never run* and *healthy*. A readiness round trip of 10 s or more is flagged as a likely free-tier cold start.
- **Refresh:** all three queries poll every 30 s through React Query's `refetchInterval`, which skips ticks while `document.visibilityState` is `hidden`. Refetch-on-focus catches the page up when the tab comes back. A failed poll after earlier success shows readiness as *Unreachable* (never a stale *Ready*) and keeps the last job list with a "couldn't refresh" banner.

### Phase W6 — Feature flags console (issue #74, depends on docforum-core#132)

docforum-core#132 describes the flag service (boolean and percentage flags,
targeting by role or user-id allowlist, admin list/toggle endpoints, audit
event per change) but no shapes, and hasn't landed. Everything below is
assumed and mirrored in `models.ts` under "Phase W6 — Feature flags console".

- `GET /admin/flags` → `FeatureFlag[]`, unpaginated (tens of flags per environment). `FeatureFlag` = `{id, key, description, kind: 'boolean'|'percentage', enabled, rolloutPercentage, targeting: {roles: Role[], userIds: string[]}, createdAt, updatedAt}`. `rolloutPercentage` is a whole number 0–100 for percentage flags and `null` for boolean ones. Each environment has its own database, so the list is simply "this environment's flags"; there's no `environment` field.
- `PATCH /admin/flags/:key` (body: any of `{enabled, rolloutPercentage, targeting}` plus `expectedUpdatedAt`) → the saved `FeatureFlag`. Only changed fields are sent. `targeting` is replaced as a whole whenever roles or allowlist change. `409` means someone else changed the flag first, `404` means it's gone, and `400`/`422` carry the server's message.
- **Evaluation order assumed for the "who it reaches" text:** `enabled: false` is a kill switch (off for everyone, allowlist included). When enabled, allowlisted users always get the flag. Everyone else must match `roles` (empty means all roles) and, for percentage flags, fall in the sticky hash bucket. If #132 lands with different precedence, `describeAudience` in `features/admin-flags/flags.ts` is the one place to change.
- **Last changed by / when** comes from the *real* audit listing (#43): one `GET /admin/audit-events?entityType=FeatureFlag&limit=200`, newest event per `entityId` (the flag's `id`). This assumes #132 writes flag changes with `entityType: 'FeatureFlag'` and the flag id as `entityId`. Flags missing from that page say "before the latest 200 flag changes" if there are more pages, otherwise "no changes recorded since it was created". The actor is shown as role and short user id, or "you", because audit events carry no email. If the audit request fails, the console still works and says the last change is unavailable.
- **Validation (client-side, server presumed to re-check):** percentages must be whole numbers 0–100 (no decimals or exponents). Allowlist entries must be UUIDs, lower-cased and de-duplicated, at most 500. Ids already saved on the flag pass through unchecked, so an unexpected server-side id format can't block unrelated edits.
- **Optimistic updates:** confirming writes the change into the cached list straight away, and the flag shows "Saving…" with its controls disabled until docforum-core answers. On failure only that flag is restored, and only while the cached copy still has the `updatedAt` the save started from. A list snapshot is never restored, because that would undo a save to a different flag that is in flight or already done. Every outcome then refetches the list and the audit page (without awaiting, so a cold start doesn't hold "Saving…").
- An open dialog compares its flag's `updatedAt` with the live list. If someone else saved in the meantime, it says so, blocks confirming, and offers to start again from the latest values.
### Invitation redemption — admins & facility staff (issue #81, PRD OQ-2)

Admins and facility staff never self-register; they join through an
invite link (`/#/invite?token=…`). Everything below is ASSUMED — it
depends on docforum-core#39 (admin invites) and docforum-core#75
(facility staff invites), neither of which has landed. Mirrored in
`src/types/models.ts` as `AccountInvite` / `InviteRole` /
`AccountInviteStatus`.

- `GET /auth/invites/:token` (unauthenticated — the link itself is the
  credential) → `AccountInvite` = `{id, email, role: 'facility'|'admin',
  organisationName, organisationType?, invitedBy?, status:
  'pending'|'accepted'|'revoked'|'expired', invitedAt, expiresAt}`.
  `404` = unknown token (also covers a used token the server no longer
  returns); a recognised-but-consumed invite is assumed to come back as
  `200` with `status: 'accepted'`.
- `POST /auth/invites/:token/accept` (body: `{email, fullName?,
  password?}`) → the same `{user, accessToken}` session envelope as
  signup/login. A brand-new user sends `fullName` + `password`; an
  existing user accepts after logging in by sending just `{email}` with
  their `Authorization: Bearer` token. `email` must match the invite
  (server-checked; mismatch assumed `422`).
- **The role is NEVER in the request** — docforum-core derives it from
  the token, so a tampered client cannot pick a role (PRD OQ-2). Covered
  by tests, including one that appends `?role=admin` to the invite link
  and asserts neither the shown role nor the accept payload changes.
- Frontend behaviour: the token is read from the URL once and
  immediately stripped (`replace`), so the credential never lingers in
  the address bar or browser history; the log-in round trip for existing
  users carries it in React Router state only. Nothing is written to
  localStorage/sessionStorage (hard rule) — reloading `/invite` shows
  the invalid-link state and the person simply reopens the link from
  their email.
### Phase W6 — Fulfilment disputes (issue #76, depends on docforum-core#76)

docforum-core#76 (facility-side fulfilment proof and patient receipt
confirmation) has not landed, so every shape below is assumed and mirrored in
`models.ts` under "Phase W6 — Fulfilment disputes". The endpoints live under
`/admin/disputes` and are gated to the `admin` role by the route guard; every
call still goes through docforum-core (hard rule 1).

- `GET /admin/disputes?status=open&cursor=` → `{items: FulfillmentDisputeSummary[], nextCursor}`; the console only ever asks for `status=open`. The server should send oldest first, and the console re-sorts every loaded page by `openedAt` so "by age" holds across cursor pages too. `FulfillmentDisputeSummary` = `{id, status, orderId, orderType, itemName, patientName, facility: {id, name}, amountStroops, asset, reason, openedAt, updatedAt}`. No patient email or profile id is sent.
- `GET /admin/disputes/:id` → `FulfillmentDispute` = the summary plus `patientReport`, `facilityProof: DisputeFacilityProof | null`, `payment: {intentId, status, escrowId}`, `timeline: DisputeTimelineEvent[]`, and `{resolvedAt, resolution, resolutionNotes, resolvedBy}`. A `404` means the dispute is gone (or the backend doesn't serve it yet), not an empty queue.
- `DisputePatientReport` = `{reason: 'not_received'|'wrong_item'|'incomplete'|'damaged'|'other', description, submittedAt, submittedBy}`. `DisputeFacilityProof` = `{reference, note, submittedAt, submittedBy, attachments: DisputeAttachment[]}`; a `null` proof is normal and the detail warns that resolving for the facility would move money on the patient's word alone. `DisputeAttachment` carries metadata only — `{id, filename, contentType, sizeBytes, kind: 'dispensing_record'|'specimen_id'|'photo'|'other', uploadedAt, uploadedBy}` — never a durable URL.
- **Attachments are opened only through fresh signed URLs:** `POST /admin/disputes/:id/attachments/:attachmentId/signed-url` → `{url, expiresAt}`. The console mints one per click, renders the returned URL in a `target="_blank" rel="noopener noreferrer"` link, and keeps it only in component state. It is never put in React Query's cache, never stored in `FulfillmentDispute`, and re-requesting replaces it, so a copied or expired link is not reused. `404` means the attachment is gone and asks the facility to resubmit.
- `POST /admin/disputes/:id/resolve` (body: `{resolution: 'facility'|'patient', notes, expectedUpdatedAt}`) → the updated `FulfillmentDispute`. Resolution is **final**: docforum-core releases the held escrow to the facility or refunds the patient and no endpoint reverses it. `expectedUpdatedAt` is the `updatedAt` the admin saw, so a concurrent resolution comes back as `409` (or `404` if it vanished); those close the dialog and refetch rather than resubmitting. `400`/`422` keep the dialog open with the server's message. A network failure is reported as *unconfirmed* — the dialog stops offering the confirmation, because retrying a final action could double-apply it, and asks the admin to reload first.
- **The consequence is shown before confirming:** the dialog derives it from `payment.status` and the disputed amount. `escrowed` → "Release {amount} from escrow to {facility}" or "Refund {amount} from escrow to {patient}"; any other status (already released/refunded/created/failed) → "No money moves…" rather than promising a second transfer. The admin must also tick an explicit "this is final and cannot be undone" box, and notes are required (10–500 characters, whitespace collapsed) for the audit trail.
- `DisputeTimelineEvent` = `{id, at, actorRole: Role|'system', actorName, kind: 'opened'|'proof_submitted'|'patient_message'|'payment'|'resolved', summary}`, oldest first as sent. It is display-only; the console never invents events.
- Queue badges escalate at 24 h and 72 h open (tighter than the referral queue's thresholds, because each open dispute is blocked escrow). A queue/detail `403` says the admin session lost access; queue errors offer a retry and keep already-loaded pages visible.
- Mock fixtures (`dsp-demo-1…3`) cover proof-with-attachments, no-proof, and a multi-page queue (mock page size 2); `npm run dev:mock` serves the resolve and signed-URL endpoints from `src/mocks/handlers/disputes.ts`.

### Phase W6 — Doctor verification review queue (issue #64)

The decision endpoint is **real**: `PATCH /doctors/:id/verification` (body
`{status}`) is docforum-core's admin-gated status flip, which writes its
`doctor.verification_status_changed` AuditEvent in the same transaction and
is a documented no-op (no event) when the profile already has that status.
Everything else is assumed — credential storage is docforum-core#52:

- `GET /admin/verifications?status=pending&cursor=` → `{items, nextCursor}`
  where `VerificationQueueItem` = `{doctorProfileId, fullName, specialties[],
  submittedAt, documentCount, verificationStatus}`. **API gap:** core has no
  admin doctor listing at all, and `submittedAt` is assumed to be the
  application time (profile creation). A dedicated core issue is worth filing
  for this endpoint.
- `GET /admin/verifications/:doctorProfileId` → `VerificationDetail` =
  `{profile: {id, fullName, email | null, verificationStatus, specialties,
  submittedAt, createdAt, updatedAt}, documents: CredentialDocument[]}`;
  `CredentialDocument` = `{id, fileName, contentType, sizeBytes, uploadedAt}`
  — metadata only, never bytes and never a durable URL.
- `POST /admin/verifications/:id/documents/:documentId/signed-url` →
  `{url, expiresAt}` — minted per click and held in component state only,
  exactly like the disputes console's attachments.
- **Reason + `expectedUpdatedAt` travel with the real PATCH and are currently
  *stripped* by core's zod schema** (it validates `status` only): the reason
  is required and validated client-side (10–500 chars, whitespace collapsed)
  but does not persist yet, and a real `409` cannot occur yet either. The UI
  handles `409`/`404` (another admin decided first) by closing and reloading
  the record and `400`/`422` by staying open with the server's message, so
  once core#52/#60 adds persistence and optimistic locking the flow is
  already correct. **Known gap, not a silent assumption.**
- **Decision history is real, not assumed:** projected from
  `GET /admin/audit-events?entityType=DoctorProfile&entityId=` (core#43),
  keeping only `doctor.verification_status_changed` events (other actions on
  the same entity are ignored). An audit failure degrades to a notice — the
  rest of the detail keeps working.
- The queue lists `pending` only; a decided doctor drops out of it on refresh
  (`admin.verification.decision` in `invalidations.ts` invalidates the detail,
  the list and the audit trail together).
- Dev/mocks: `src/mocks/handlers/verifications.ts` serves the queue, detail,
  signed URLs, the PATCH (including the no-op-on-same-status semantics) and
  `GET /admin/audit-events`; fixtures seed two waiting doctors (one with zero
  documents) plus one already decided with history.

### Phase W6 — Per-specialty verification review (issue #65, depends on docforum-core#51)

docforum-core#51 names the two admin endpoints (`GET
/admin/specialty-verifications?status=pending`, `PATCH
/admin/specialty-verifications/:id`) but specifies no shapes, and hasn't
landed. The credential attachment, the filter parameters, the envelope and
the specialty catalog are assumed here and mirrored in `models.ts` under
"Phase W6 — Per-specialty verification review". This is a *different* screen
from the doctor verification queue above (issue #64): that one decides a
doctor account, this one decides each claimed doctor↔specialty pair.

- `GET /admin/specialty-verifications?status=&specialtyId=&olderThan=&cursor=` → `{items: SpecialtyClaim[], nextCursor}`, one row per doctor↔specialty pair (`DoctorSpecialty` + review fields), oldest claim first, keyset cursor like the other admin listings. `status=pending` is always sent (the queue only shows undecided claims); `specialtyId` and `olderThan` (`24h`/`72h`/`168h`, same duration syntax as docforum-core#68's `olderThan`) are optional filters and live in the URL. Grouping by doctor is done client-side — the console's promise, not the API's.
- `SpecialtyClaim` = `{id, doctorId, doctor: {id, fullName}, specialtyId, specialty: Specialty, status: VerificationStatus, credential: {id, fileName, mimeType, sizeBytes, uploadedAt} | null, rejectionReason, reviewedById, reviewedByName, reviewedAt, createdAt, updatedAt}`. `status` is always `pending` while the claim is in the queue; approving sets it to `verified`, rejecting to `rejected`, and the claim leaves the queue.
- `GET /admin/specialty-verifications/:id/credential` → the supporting document as a file stream (`application/pdf` and images today). Assumed: #51 doesn't mention credentials at all, but the issue requires "the relevant credential beside each claim". The console fetches it as a blob and opens it via an object URL, so the bearer token never lands in a link href. `404` for a claim with no attachment (the list row says so on screen either way).
- `PATCH /admin/specialty-verifications/:id` (body: `{decision: 'approve' | 'reject', reason: string | null, expectedUpdatedAt}`) → the updated `SpecialtyClaim`. `reason` is **required for rejections** and shown to the doctor as what to fix or resubmit (server presumed to enforce this too — the mock does, with `422`); optional note on approval. `expectedUpdatedAt` is the claim's `updatedAt` as the admin saw it, so `409` means someone else reviewed it first. `409`/`404` close the dialog and refetch; `400`/`422` keep it open with the server's message; a network failure keeps it open and says a retry is safe (a duplicate comes back as `409`).
- `GET /specialties` → `Specialty[]` — specialty catalog for the filter dropdown. Assumed from docforum-core#23 ("specialty catalog + `GET /doctors`"), which hasn't landed; on failure the dropdown falls back to the specialties present in the loaded claims.
- **Out of scope by the issue's own rules:** bulk actions (each claim deserves a look). A claim with `credential: null` is still reviewable — the card calls out that approving is a judgement call and suggests asking for credentials or rejecting with what to upload.
### Phase W7 — Notification preferences, SSE, time zones and evaluated flags

These shapes back issues #108–#111. None of the corresponding backend
contracts has landed yet (`docforum-core` #97, #99 and #132 are open), so
everything below is assumed and mirrored in `models.ts` under "Phase W7".

#### Notification preferences (issue #108, docforum-core#99)
- `GET /notifications/preferences` (Bearer) → `NotificationPreferences` = `{preferences: NotificationPreference[], quietHours: QuietHours, updatedAt?}`. `NotificationPreference` = `{type, channel: 'email'|'sms'|'in_app', enabled, locked, lockedReason?}`. The server is expected to return the complete type × channel matrix; any missing row is filled from the role defaults in `features/notifications/preferences.ts`.
- `PATCH /notifications/preferences` with either `{preferences: [{type, channel, enabled}]}` (only changed rows) or `{quietHours}` → the saved `NotificationPreferences`. `critical_lab_result` and `security_alert` are always on and `locked: true` on every channel; the UI cannot disable them and the API is expected to answer `422` if asked to. `marketing` defaults off.
- `QuietHours` = `{enabled, start, end, timeZone}`, where `start`/`end` are wall-clock `HH:MM` interpreted in the IANA `timeZone`. The UI only validates the format and that start ≠ end; it does no offset arithmetic. Delivery suppression is entirely server-side.
- Saves are optimistic. A failed save restores the previous cached snapshot and shows that it did; every outcome refetches the server state.

#### Server-Sent Events (issue #109, docforum-core#97)
- `GET /events` (`Accept: text/event-stream`, Bearer, optional `Last-Event-ID`) opens one stream per browser tab. The client uses `fetch`, not `EventSource`, because `EventSource` cannot attach the bearer token.
- Event names routed into React Query are `notification.created`, `queue.updated`, `message.created` and `admin.alert`; `auth.expired` / `session.expired` trigger one refresh and reconnect. Unknown event names are still delivered to wildcard subscribers.
- Heartbeat/comment lines are ignored. `id:` drives `Last-Event-ID`; `retry:` is honoured once, bounded to 30 s, then exponential backoff resumes (1 s, 2 s, … max 30 s). A transport `401` triggers one single-flight refresh; if it fails, the manager reports `error` and stops reconnecting.
- The stream is ref-counted by subscribers and closes when the last one leaves. After the tab has been hidden for 60 s the connection is closed and re-opened on visibility. The replay cursor is held in memory only (lost on reload) and cleared when the signed-in user changes.

#### Time zones (issue #110)
- Client-only; no API contract. `TimeZoneProvider` stores an explicit IANA zone in `localStorage['docforum-time-zone']`, falling back to the browser zone and then UTC. Formatting is delegated to `Intl` through `src/i18n/time-zone.ts`; there is no manual offset arithmetic.
- `DualZoneTime` shows a second zone only when it differs from the viewer's. `CareTimeline` reads the doctor's zone from `step.metadata.doctorTimeZone` (assumed metadata until the backend exposes it).
- The issue names booking/appointment screens for dual-zone display, but this repo has no booking or appointment-list screen yet (see `ROADMAP.md` Phase W2), so only the reusable component and the care timeline are wired.

#### Evaluated feature flags (issue #111, docforum-core#132)
- `GET /me/flags` (Bearer) → `EvaluatedFlags` = `{flags: Record<string, boolean>, evaluatedAt?}`. Evaluation (role targeting, allowlist, percentage bucket) is entirely server-side; this repo only reads booleans.
- The query is per user id, stale for 5 minutes. Missing, unknown or failed flags are `false`; a failed request never falls back to another user's cached values. `<Flag>` renders `loadingFallback` until the first answer and `fallback` when the flag is off/unavailable, so protected UI never flashes first.
- Known flags are `notification_preferences` and `realtime_updates`; the backend may return more. The mock dev panel can override flags locally.

### Scan-to-verify orders with device camera (issue #52, docforum-core#71)
- `POST /facilities/me/verify-order` (body: `{ token: string }`) → `VerifyOrderResponse`
  - Token verification endpoint returning 5 explicit states: `valid`, `superseded`, `expired`, `fulfilled`, `not_eligible`.
  - Minimal order summary for fulfillment verification: `orderId`, `orderType`, `patientName`, `medicationOrTest`, `instructions`, `issuedAt`, `expiresAt`, `supersededBy`, `fulfilledAt`, `fulfilledByFacility`.
  - Rate-limiting (HTTP 429) protection against brute-force token enumeration; error surfaced clearly in UI with retry guidance.
  - Device camera QR scanning using `BarcodeDetector` API with fallback; strict camera media stream track teardown on unmount or screen exit.
  - Manual token entry fallback.

### Facility payout ledger & escrow terms (issue #53, docforum-core#90)
- `GET /facilities/:facilityId/payout-ledger?cursor=&status=&asset=` → `FacilityLedgerPage`
  - Cursor-paginated ledger of on-chain escrow deposits, releases, and refunds.
  - Totals breakdown for held, released, and refunded funds separated by asset (`XLM` vs `USDC`).
  - Strict BigInt-safe amount formatting for Stellar stroops (7 decimals: 1 XLM/USDC = 10,000,000 stroops).
  - Escrow terms in plain language (releaser condition, refund deadline countdown).
  - Approaching deadline warnings: prominent alerts when held escrow refund deadline is < 48 hours away and order is unfulfilled (Threat Model T8 compliance).
  - Direct explorer links to Stellar testnet transactions (`https://stellar.expert/explorer/testnet/tx/...`).

### Phase W2 — Facility finder on `GET /facilities/eligible` (issue #257)

The finder calls docforum-core's public `GET /facilities/eligible` with
`type` (required; the "All facilities" tab sends one request per type and
merges), optional `catalogItemCode`, and `near=lat,lng` when the patient
shares a location. `radiusKm` is not sent. The endpoint has no free-text
search, so the area box filters the returned list by name, city and address
in the browser. Results are sorted nearest first with `distanceKm: null`
last. The endpoint is not yet in the vendored OpenAPI file, so the call goes
through `apiFetch` with the response shape from `types/models/facility-finder.ts`.

### Phase W2 — Facility prices for an order item (issue #258)

`docforum-core` has no public per-item facility pricing endpoint yet, so these
shapes are assumed and mirrored in `types/models/facility-finder.ts`:

- `GET /facilities/eligible?catalogItemCode=&type=&lat=&lng=&query=` →
  `EligibleFacility[]` — `FacilityWithDistance` plus
  `price: {amountStroops, effectiveFrom} | null` and `priceOnRequest: boolean`.
  `price` is the version in force now; a facility with no published price (or
  only a scheduled one) returns `price: null` with `priceOnRequest: true`. The
  finder's own filters are passed through too, so its type/distance controls
  keep working when it is opened from an order.
- `GET /facilities/:facilityId/prices` is the public view of the facility price
  history already used by facility settings. The finder reads it per card for a
  "price changed on …" note and picks the row in force itself — a future-dated
  (scheduled) version is never treated as current.
- `amountStroops` stays a string and is handled in BigInt
  (`features/payments/stroops.ts`, `features/orders/facility-price.ts`); it is
  never converted through `Number`, including when sorting by price.
- `PatientOrder.catalogItemCode` is an assumed optional field, used only to open
  the finder for that order's item; when it is absent the orders list keeps the
  ordinary facility picker and the finder shows no prices.

### Account deletion against the real API (issue #260)

`docforum-core` #41 has landed, so this is no longer an assumption:

- `DELETE /patients/me` (patient, bearer token) with body `{password}` →
  `204 No Content`. The typed `DELETE` phrase is a client-side safeguard
  only and is never sent.
- A wrong password is `403 PASSWORD_CONFIRMATION_FAILED`; the UI renders it
  on the password field, not as a form-level error. Repeated wrong passwords
  count against docforum-core's login throttle, so a `429` honours
  `Retry-After`.
- `204` is success with no body: the client clears the React Query cache,
  the Zustand session and the acting-profile state, then redirects to
  `/account-deleted`. A repeat request is idempotent (core returns `204`
  again).
- Guardians may delete their account. Core revokes every guardianship in
  the same transaction and leaves dependents' profiles and appointments
  untouched, so the UI does not block deletion for a guardian with active
  dependents.

### Phase W7 — Error catalogue documented codes (issue #276)

`src/services/error-catalogue.ts` maps all error codes documented in `docforum-core`'s `docs/api/README.md` (including `EMAIL_NOT_VERIFIED`, `FEATURE_DISABLED`, `GUARDIANSHIP_INACTIVE`, `DEPENDENT_NOT_A_MINOR`, `EXPORT_NOT_READY`, `EXPORT_EXPIRED`, `LAB_RESULT_*`, `REFERRAL_NO_ELIGIBLE_TARGET`, `WALLET_NOT_LINKED`, `FACILITY_WALLET_NOT_LINKED`, `PAYEE_TRUSTLINE_MISSING`, `INVALID_CURSOR`, `OBJECT_STORAGE_NOT_CONFIGURED`, and others) to localized user-facing copy and recovery actions.

### Patient payment history filters & CSV export (issue #277)

`GET /payments/mine` is assumed against `docforum-core#90` with query parameters:
- `status`: filter by payment status (`created`, `awaiting_signature`, `escrowed`, `released`, `refunded`, `failed`).
- `from` and `to`: ISO date strings filtering payment creation date range.
- `limit`: page size (default 50, up to 100).
- `cursor`: pagination cursor.

Response returns `{ intents: PaymentHistoryEntry[], nextCursor: string | null }` (or `{ items: PaymentHistoryEntry[], nextCursor: string | null }`).
Each entry retains assumed `facilityName` and `refundDeadlineAt` fields. In-memory CSV generation parses stroop amounts using BigInt without floating-point conversion, neutralises formula prefixes, and formats Stellar explorer links.

### Phase W2 — structured intake, patient referrals and waitlist (added 2026-11-19)

These contracts are assumed; reconcile against `docforum-core` once the
corresponding backend issues land. Client types live in
`src/types/models/intake.ts`, `patient-referrals.ts` and `waitlist.ts`.

#### Structured intake write (issue #36, docforum-core#1/#2)
- `POST /appointments/:appointmentId/intake` (body: `SubmitIntakeInput`) → `IntakeForm`, the same shape the doctor-side `GET /appointments/:id/intake` already returns.
- `SubmitIntakeInput` shape: `{slotId, chiefComplaint, symptomDuration?, severity?, currentMedications: string[], allergies: string[], notes?}`.
- `409`/`404` mean the slot expired or was released while the patient was typing. The client keeps its in-memory draft, never retries automatically, and explains the slot is gone.
- Drafts are client-only: a Zustand store for the tab session, cleared on success, sign-out, idle timeout and acting-for profile switch. Nothing is written to browser storage.

#### Patient referrals (issue #4, docforum-core#5–#8)
- `GET /patients/me/referrals` → `{items: PatientReferral[]}`
- `POST /referrals/:id/accept` → `{referral, appointment: ReferralAppointment}`
- `POST /referrals/:id/decline` → `{referral}`
- `PatientReferral` adds `targetSpecialty`, `referringDoctor`, `targetDoctor`, `appointment` (`null` until accepted) and `referralNote?` to the existing `Referral` shape.
- A referral is never auto-booked: only accept creates an appointment. `409`/`404` are presented as "someone already answered this referral", not a generic failure.
- `ReferralAppointment.requiresIntake` routes the patient to `/patient/appointments/:id/intake` instead of collecting intake again inside the accept flow.

#### Waitlist with time-boxed offers (issue #16, docforum-core#57)
- `GET /patients/me/waitlist` → `{items: WaitlistEntry[], serverNow}`
- `POST /patients/me/waitlist` (body: `{doctorId?, specialtyId?, preferredWindow}`) → `WaitlistEntry`
- `PATCH /patients/me/waitlist/:id` (body: `{preferredWindow, expectedUpdatedAt}`) → `WaitlistEntry`; `409` on a concurrent edit.
- `DELETE /patients/me/waitlist/:id` → `void`
- `POST /waitlist/offers/:offerId/accept` → `{entry, appointmentId, requiresIntake}`; `409` when the hold already lapsed.
- `POST /waitlist/offers/:offerId/decline` → `{entry}`
- Countdowns are anchored to the `serverNow` sent with the list and with each offer, never to the device clock alone.

### Backend liveness probe and reachability

- `GET /health/live` → HTTP 200 `{"status":"ok"}`. Public, unauthenticated liveness
  probe fired once at boot (non-blocking) and on user retry to warm cold-started
  Render instances and detect reachability failures separately from browser offline state.

### Phase W2 — Doctor directory & specialty search (issues #1, #13)

No assumption remains for doctor discovery: `docforum-core`'s public directory
endpoints are real and are the only source this repo calls.

- `GET /specialties` → `Specialty[]` (`{ id, name, slug }`).
- `GET /doctors?specialty=<slug>&q=&limit=&cursor=` →
  `{ items: [{ id, fullName, specialties: [{ id, name, slug }] }], nextCursor }`.
  Only verified profiles and public fields are returned; `limit` is 1–50 and
  pagination is a keyset cursor.
- `GET /availability/doctors/:doctorProfileId/slots` → open future
  `AvailabilitySlot[]` (`{ id, doctorProfileId, status, startTime, endTime,
  createdAt, updatedAt }`). Public by design.

`src/services/doctor-directory-service.ts` owns the directory reads and pages
the list explicitly (`listAllPublicDoctors`, `getPublicDoctor`) because there is
no public single-doctor route. Availability is read through
`src/services/appointments-service.ts`'s `getOpenSlots`.

The older symptom-search path (issue #30, `src/features/search/`) still uses its
own assumed `/symptoms` + `specialtyIds` contract; it is deliberately untouched
here and remains tracked as an assumption.

### Doctor profile week view — doctor time zone (issue #13)

The profile page renders every slot in the patient's chosen IANA zone
(`TimeZoneProvider`) and states that zone above the grid. When the doctor's
zone is known and differs, it is shown as "…'s local time: <zone>".

**Assumed:** `GET /doctors` does not expose the `DoctorProfile.timeZone` column
today, even though the column exists in docforum-core's schema. The frontend
types it as optional (`PublicDoctor.timeZone`); until the public projection
includes it, the doctor-zone line is simply absent and only the patient's zone
is shown. No request is made to an endpoint that does not exist — the profile
itself is resolved by paging the real public list, which also avoids assuming a
`GET /doctors/:id` route.

### Phase W2 — Booking & structured intake (issue #2)

Both writes are real; nothing in this flow is mocked or assumed.

- `POST /intake` (patient) — body
  `{ symptoms: [{ symptom, duration, severity: 'mild'|'moderate'|'severe' }],
  freeTextNotes? }` → the created `IntakeForm` row. `symptoms` requires at
  least one entry.
- `POST /appointments` (patient) — body
  `{ availabilitySlotId, patientProfileId? }` → the created `Appointment` row
  (`{ id, patientProfileId, doctorProfileId, availabilitySlotId, status,
  origin, createdAt, updatedAt }`). `409` means the slot is no longer open;
  the UI treats that as its own recoverable state, not a generic failure.

Gaps worth knowing:
- The intake write and the booking write are separate calls with no link
  between them yet — core's `POST /appointments` does not accept an intake id
  (the `intakeId` TODO in its schema remains open). The booking flow submits
  intake first so a 409 never leaves a confirmed visit without intake.
- `POST /intake` always records against the caller's own patient profile; it
  has no `patientProfileId` parameter. When a guardian books for a dependent
  (`patientProfileId` on the booking), the appointment targets the dependent
  but the intake row is the guardian's. The booking screen says so plainly.
- `GET /appointments/mine` carries `doctorProfileId` but no clinician name;
  patient screens resolve names from the public `GET /doctors` directory and
  show "Your clinician" when a doctor is no longer listed.

### Price list editor against `/facilities/me/prices` (issue #270)

- **Endpoint shape:** Calls `GET /facilities/me/prices` and `POST /facilities/me/prices` — the `/me` variant resolves the facility from the authenticated user's session rather than accepting a `facilityId` parameter. The previous `/facilities/:facilityId/prices` shape is still supported for backward compatibility but the `/me` endpoint is the canonical path going forward.

- **Amount conversion:** Entered amounts are decimal strings (e.g. `"27.5"`). The `parseAssetAmount` helper in `src/features/facility-settings/validation.ts` converts these to raw stroops integers using `BigInt` arithmetic, respecting per-asset decimal precision (XLM and USDC both support 7 decimal places = 10_000_000 stroops per whole unit). Exponent notation (e.g. `1e-5`) and decimals beyond the asset's precision limit are rejected with a `400` error, matching the backend's validation.

- **Versioned writes:** Creating a price version via `POST` does not edit an existing record; it adds a new entry to the version history. The frontend presents history as three states: **current** (effective now), **scheduled** (effectiveFrom in the future), and **superseded** (older versions). A duplicate `effectiveFrom` returns `409` from the backend, which the UI handles by keeping the earlier snapshot and explaining the conflict.

- **Verified email requirement:** Write mutations (`createFacilityPrice`) require the user's email to be verified. If the session has an unverified email, the save is rejected with a clear error — the backend enforces this guard.

- **BigInt-safe throughout:** The shared `validation.ts` `parseAssetAmount` and `formatAmountFromStroops` functions use `BigInt` internally and never pass through `Number()`, preserving exact stroop values for all asset amounts.

### Stuck referrals console against `/referrals/admin/*` (issue #273)

- **Queue list:** `GET /referrals/admin/queue?olderThan=<24h|48h|72h|168h>` — returns `{items: StuckReferral[], nextCursor}` oldest first. The `olderThan` parameter is the only server-side filter; the UI's 1/2/3/7-day thresholds map to the durational values `24h`, `48h`, `72h`, `168h`. A `reason` filter is applied client-side over the loaded pages, since docforum-core#68 does not expose a server-side `reason` query parameter (unknown params return `400`).

- **StuckReferral shape:** Embedded `stuckReason: 'no_doctor'|'doctor_inactive'|'loop_flagged'`, `targetSpecialty: Specialty`, `referringDoctor`/`targetDoctor` as `{id, fullName}`, and `chain: ReferralChainLink[] | null` (present only for `loop_flagged`, oldest hop first, ending with the referral itself). `ReferralChainLink` = `{referralId, referringDoctor, targetSpecialty, targetDoctor, status, createdAt}`. No patient name or ID is shown.

- **Reassign:** `POST /referrals/admin/:id/reassign` body = `{targetDoctorId, reason, expectedUpdatedAt}`. Returns the updated `Referral`. `409` if the referral is not in `pending` status — the dialog closes and the queue refetches. Client-side eligibility checks: only verified doctors in the target specialty, excluding the current target doctor and the referring doctor. Availability (open slots in next 7 days) is also re-checked from `/admin/doctors?specialtyId=...&verificationStatus=verified`.

- **Cancel:** `POST /referrals/admin/:id/cancel` body = `{reason, expectedUpdatedAt}`. Docforum-core notifies the patient; the client only records the action. The resulting status is not assumed to be `cancelled` in `ReferralStatus` (no cancelled value yet).

- **Audit events:** `GET /referrals/admin/:id/audit-events` returns `{items: AuditEvent[], nextCursor}` newest first. Each event has `actorUserId`, `actorRole`, `entityType: 'Referral'`, `entityId`, `action`, `fromState`, `toState`, `requestId`, `metadata`, `createdAt`. The console links each action to `/admin/audit?entityType=Referral&entityId=<id>`.

- **409 conflict handling:** If reassign or cancel receives `409` (someone else modified the referral), the dialog closes and the queue is refetched. Network failures leave the dialog open; retrying is safe because a duplicate submission comes back as `409`.

### Feature flags console against `/admin/feature-flags` (issue #274)

- **List endpoint:** `GET /admin/feature-flags` — returns an unpaginated array of `FeatureFlag` items in the current environment. There are typically dozens of flags, not thousands. Each flag has `key`, `description`, `enabled`, `kind` (`boolean` or `percentage`), `rolloutPercentage` (optional), and `targeting` (`roles: Role[]`, `userIds: string[]`).

- **Update endpoint:** `PATCH /admin/feature-flags/:key` — partial update with `{ expectedUpdatedAt, enabled?, rolloutPercentage?, targeting? }`. The `:key` path parameter is validated by the backend as a lowercase dotted segment of up to 64 characters; a `400` is returned for malformed keys (e.g. uppercase, spaces, exceeding 64 chars). The `expectedUpdatedAt` field enables conflict detection: if the flag has been modified since the admin loaded it, the server returns `409`.

- **Key format:** New keys must conform to the pattern `lowercase.dotted.segments` with a maximum of 64 characters total. The UI validates this on save and shows a `400` error message if the key is invalid. Existing keys are preserved; only the admin can create new keys via the edit dialog.

- **Audit trail:** Every save creates an audit event with `entityType: 'FeatureFlag'` and `action: 'feature_flag.updated'`. The `updatedAt` timestamp and `actorUserId`/`actorRole` are stored. The console shows "Changed X ago by Y" per flag and provides a "View in audit trail" link to `/admin/audit?entityType=FeatureFlag&entityId=<flagKey>`.

- **State & rollout:** Three states: `on` (enabled, rolloutPercentage = 100 or absent), `rollout` (enabled, rolloutPercentage < 100), `off` (enabled = false). The rollout percentage must be a whole number 0–100. Role targeting is a multi-select; the allowlist is a free‑form list of user UUIDs (one per line, comma-, or space-separated). Duplicate or invalid UUIDs are rejected before the save request is sent.

- **Conflict handling:** If another admin saves the same flag between the time the current admin opens the edit dialog and confirms, the save receives `409`. The UI shows "was changed by someone else after you opened it" and offers "Start again from the latest" to refetch the flag and reset the draft. The save is not silently applied; only the flag that failed is rolled back, never another in-flight save.

- **Permission model:** Admin accounts are seeded/invited (PRD OQ-2), not self-registered. The console is only accessible to users with the `admin` role.

### Phase W2 — Orders scoped to the acting profile (issue #295)

`GET /orders/mine` takes an assumed optional `?patientProfileId=` query
parameter. Without it the endpoint returns every order for the caller, and a
guardian acting for a dependent cannot be scoped: the same browser session is
used for both profiles, so the client sends the selected profile id explicitly
(`services/orders-service.ts`, `features/orders/hooks/useOrders.ts`) and the
dev-mock filters on it. Reconcile with docforum-core when the acting-profile
contract lands; health and care-thread reads already scope by the
`/patients/:profileId/...` path.

## Generated contract

All API routes covered by this repository's typed client are declared in
`packages/api-client/openapi/docforum-core.openapi.yaml`. The generated
`@docforum/api-client` package owns the paths, request payloads, response
schemas, error envelope shape, and BigInt-as-string payment fields. Run
`npm run generate:api` after changing the fixture; `npm run typecheck` and
`npm run build` run generation automatically.

The following contracts are generated and are no longer frontend assumptions:

- W2 dependents, health profile, data export, account deletion, care threads,
  and facility finder.
- W3 queue, messaging, consultation notes, and practice insights.
- W4 facility members, invitations, and fulfillment attribution.
- W5 custodial payment intents and wallet-link operations.

`src/types/models.ts` re-exports generated schema types for compatibility with
existing imports. Services call the generated client through
`src/services/api-client.ts`, which remains the only owner of transport details
and typed errors.

## Known assumptions — platform and API client

- Acting-for profile selection is frontend-only Zustand state. The selected
  patient profile id is included in patient query keys and API calls.
- The local OpenAPI fixture is vendored until docforum-core publishes the
  versioned package described by docforum-core#113. CI compares its version
  with the backend's published spec in warn-only mode.
- Error code meanings are sourced from docforum-core#115. Unknown codes use a
  generic localized message and request-id reference; raw server messages are
  retained only for diagnostics.
- W4 scan-to-verify and payout-ledger routes, plus W6 admin audit/access,
  referral, system-health, and feature-flag routes, still have compatibility
  types until their backend OpenAPI schemas are published. Their assumptions
  are isolated in `src/types/models.ts` and the relevant service modules.
- Theme preferences are stored under `docforum-theme` in local storage and
  fall back to system media queries when unset.

## Privacy and platform guarantees

- `src/pwa/sw.ts` precaches only the app shell and static assets. It has no
  runtime API caching route, so authenticated API responses never enter the
  service-worker cache.
- Logout clears app-owned caches while preserving static precache entries.
- Facility-search location is transient browser memory only and is never
  persisted to storage or URLs.

### Error monitoring (issue #100)

- **SDK:** `@sentry/react` (browser SDK), initialized in `src/main.tsx:48`.
- **Default off:** initialization is guarded by `if (import.meta.env.VITE_SENTRY_DSN)`; without a DSN the SDK is never loaded and no events are captured. The Pages preview ships without `VITE_SENTRY_DSN`, so monitoring is off by default there (and in local dev unless explicitly configured).
- **Session replay:** deliberately never integrated — the Replay integration is not imported or initialized.
- **Scrubber:** `src/utils/phi-scrubber.ts` runs as Sentry's `beforeSend` and `beforeBreadcrumb`. It is a pure function, unit-tested in `src/utils/phi-scrubber.test.ts` against a sample event containing intake text and other PHI patterns.
- **What is NOT sent:** request or response bodies, headers, cookies, or query strings; form values; the user's email, IP address, or username; PHI-pattern values anywhere in the event (email addresses, phone numbers, SSNs, bearer tokens); breadcrumb request bodies or URLs containing ids/tokens.
- **What is sent (scrubbed):** the error message and exception type, the HTTP method, a sanitized URL (host + route shape only; query string dropped, id-like path segments replaced with `[id-redacted]`), and an opaque user id only. Benign extra/contexts/tags pass through with sensitive keys redacted.
- **CSP:** Sentry is bundled via npm — there is no external `<script>` to whitelist. The only network target is `*.sentry.io`, and only when a DSN is configured; if a CSP is adopted, add `connect-src https://*.sentry.io`.


### Phase W7 — Platform quality (issues #116–#119)

#### DataTable pagination contract (issue #116, depends on docforum-core#114)
- `DataTable<T>` consumes server-side keyset pagination via `hasPrev`, `hasNext`, `onPrev`, `onNext` props. The UI never renders a page number — cursor pagination cannot jump to page N.
- `useTableUrlState` syncs sort, filter values and cursor to URL query params prefixed with `<id>-`. Filter values are validated (length cap, charset, allowed select options); invalid values are silently dropped. Sort direction is `asc | desc`; a third click clears sorting.
- Column definitions are typed generics; the component imposes no knowledge of any specific entity.

#### Print / PDF library lazy-load contract (issue #117)
- `jspdf` and `html2canvas` are loaded via `import('jspdf')` / `import('html2canvas')` inside `usePrint.onExportPdf`, so they are code-split out of the main bundle. `npm run check:dist` is the mock-code guard, not the bundle-size guard — check the emitted chunks for yourself.
- `PrintLayout` takes only `title: string` and `children: ReactNode`; it is decoupled from any specific data shape.
- No print-related data is sent to third parties. PDF generation is fully client-side.

#### Analytics endpoint contract (issue #118)
- `VITE_ANALYTICS_ENDPOINT` is read inside each `send()` call (not at module load time) so environment stubs work in tests.
- `scrubUrl` strips query strings entirely and replaces UUIDs/numeric path segments; it does not retain any user-provided input.
- `ALLOWED_EVENTS` is a `const` tuple; TypeScript prevents callers from passing unlisted event names.
- Plausible/Umami event body: `{event, path, domain, referrer, screenWidth, props?}`. If the self-hosted endpoint expects a different shape, only `send()` in `analytics.ts` needs updating.

#### Configurable router contract (issue #119, docs/adr/0001-routing-strategy.md)
- `VITE_USE_HASH_ROUTER=true` → `createHashRouter`; absent or `false` → `createBrowserRouter` (data routers since issue #112; see `src/router.ts`).
- GitHub Pages builds always pass `VITE_USE_HASH_ROUTER: "true"` (set in `deploy-pages.yml`).
- `HashRedirectShim` is mounted only in BrowserRouter mode; it reads `window.location.hash` directly to detect `#/` prefixes on the root path.
- Email links from docforum-core should use clean paths (`/reset?token=…`), not hash paths. Old hash-format links are transparently redirected by the shim.

#### Data router, loaders and route guards (issue #112)
- Routes are data-router route objects: one factory per area in `src/routes/<area>.tsx`, assembled by `createAppRoutes({ queryClient })` in `src/routes/index.tsx`. The browser (`src/router.ts`), tests (`renderAppAt` in `src/test/render-app.tsx`) and the prerender (`createStaticHandler` in `src/prerender/entry-server.tsx`) all use that one table.
- Every page is a `lazy` route (`lazyPage(() => import(...), 'ExportName')`). `src/routes/route-helpers.test.tsx` fails if a page route is added eagerly. `main.tsx` resolves only the first URL's lazy modules before the first render (no blank flash); everything else loads on navigation.
- Role guards are loaders, not components: `guardedSection(id, roles, children)` gives each child `requireRoles(roles, prefetch)` (waits for the boot session restore, then redirects to `/login` or `/`, same as the old `RequireAuth`) and the section a `RoleGate` element (re-checks live on sign-out/idle timeout) and an `errorElement`. The guard sits on each child loader because React Router runs parent and child loaders in parallel; that is what guarantees no prefetch fires before the guard decides.
- Prefetch: a child's `prefetch(args, token)` calls `queryClient.ensureQueryData(...)` with the same `queryOptions` factory its page's hook uses, wrapped in `settlePrefetch` (waits at most `PREFETCH_BUDGET_MS`, never rejects — a failed prefetch leaves the page's own error state to report it). Add a factory next to the hook when prefetching a new page; never duplicate a key.
- Errors: loader, lazy-chunk and render failures inside a section render `RouteErrorElement` inside the layout's `<main>`; "Try again" reloads (the reliable fix for a stale chunk after a deploy). Render errors inside a mounted page are still caught by the route `ErrorBoundary` in `Layout`.

#### Mutation feedback: toasts, optimistic updates, undo (issue #113)
- `ToastRegion` is mounted once in `App.tsx`; call `showToast({ message, tone, action?, durationMs? })` from anywhere (`src/store/toast-store.ts`). Messages are short, already-translated UI copy, never server records or PHI. Errors go to the assertive region, everything else to the polite one; toasts never take focus.
- A toast is never the only place a **form** error appears — show it next to the form (`FormError`/field errors). Toasts are for background results.
- `useOptimisticMutation` qualifies only for reversible UI state the server will almost always accept: read/unread, toggles, reordering, dismissing. `useUndoableAction` (delayed commit) is for easily mis-clicked reversible actions with no compensating API call.
- **Never** optimistic or delayed for money movement or escrow: payment intents, wallet payments, payouts, refunds, dispute resolutions. Also not for server-validated form submissions (booking, sign-up). `src/hooks/optimistic-policy.test.ts` scans `src/features/payments/`, `src/features/fulfillment/`, `src/features/admin-disputes/` and `src/services/payments-service.ts` and fails CI on any optimistic helper or `onMutate`.
- Current users: notification mark-one-read (optimistic + rollback toast) and mark-all-read (undoable, committed on unmount/pagehide rather than dropped; other tabs are told on commit).

#### Date and time inputs (issue #114)
- Use `DatePicker`/`TimePicker` (`src/components/`) for every date or time field; don't add `<input type="date|time|datetime-local">`. Values stay in the native formats (`YYYY-MM-DD`, 24-hour `HH:mm`), so services and validation are unchanged. A date-and-time field is one of each (see `PriceListEditor`).
- Like native inputs, a typed date/time outside `min`/`max` is still reported (and flagged `aria-invalid` on blur); the form's own validation decides and its `error` prop wins over the picker's message.
- "Today" and the zone hint come from an explicit IANA zone (`timeZone` prop, else the user's `TimeZoneProvider` zone). The pickers never convert a value between zones; date maths is calendar-day arithmetic in UTC (`src/utils/date-input.ts`), so DST cannot shift a day.
- They work without an `IntlProvider` (English defaults, `en` locale) via `useOptionalT`, so isolated component tests and stories need no wrapper.

#### Performance budget (issue #99)
- `performance-budget.json` holds the bundle budgets; `npm run check:bundle` (CI, after `npm run build`) fails when first-load JS (entry + modulepreloads, gzip) or any lazy chunk exceeds them, and writes the numbers to the job summary. Raise a budget only in a PR that explains why.
- Lighthouse CI (`.lighthouserc.json`, `lighthouse` job in `ci.yml`) runs against the mock-only preview build (hash routing, MSW, reserved-invalid API origin; `?previewRole=` for signed-in pages) and fails on LCP, CLS, TBT or script-size regressions. Its script-size budget (450 kB transferred per page) is for that mock build: it includes the MSW mock layer (~120 kB gzip) that production never ships, on top of the production entry (~171 kB gzip) and the heaviest signed-in route (patient dashboard, ~420 kB measured). The production first-load budget is the `check:bundle` one. Desktop preset, median of three runs, so shared runners don't make it flaky; the gzip budget protects mobile download cost deterministically.
- `npm run analyze` writes the rollup-visualiser treemap to `bundle-stats/` (git-ignored); CI uploads it as the `bundle-stats` artifact.
- GSAP stays behind `import('gsap')` in `useMotion` and is not fetched at all under `prefers-reduced-motion: reduce`. Route fallbacks reserve space (`.routeFallback`) so lazy loading does not shift the footer.

### Responsive navigation and layout (issue #103)

- **Layout:** `src/components/Layout.tsx` provides the app shell: skip-to-content link, header (logo, role-aware nav, user chip, logout), mobile drawer, main content area, and footer. Landmark regions (`role="banner"`, `role="navigation"`, `role="main"`, `role="contentinfo"`) are used throughout.
- **Role-aware navigation:** `roleNavItems()` returns nav entries gated by user role (patient, doctor, facility, admin). Unauthenticated users see Log in / Sign up. Items for unbuilt or role-inappropriate screens never appear.
- **Desktop:** horizontal header nav with active-state highlighting via `NavLink`.
- **Mobile:** hamburger toggle opens a side drawer with focus trapping (Tab cycles within the drawer, Escape-like close via close button or overlay click). Drawer links are hidden from the accessibility tree (`aria-hidden`) when closed.
- **Skip to content:** visually hidden link at the top of the page, focuses on `#main-content` when activated.
- **Page header:** `src/components/PageHeader.tsx` renders a consistent page header with title (`<h1>`), breadcrumb trail (auto-derived from route or explicitly supplied), and optional actions. Supports `<h2>` override.
- **Responsive:** layout works at 320px with no horizontal scroll. Stacks vertically on mobile; desktop shows horizontal nav. All public asset URLs are rewritten correctly under the GitHub Pages base path.

### Phase W5 — Patient order detail & payment panel (issue #61, depends on docforum-core#85)

Custodial payment *mechanics* are real (docforum-core Phase 5.5, its
`docs/adr/0004-custodial-payments-v1.md`), and the order shape this page
renders is issue #5's `PatientOrder` (= `Prescription | LabOrder`, see
"Orders list and facility selection" above — nothing new is invented
here). What's still assumed is *attaching a payment intent to an order*:
docforum-core's `PaymentIntent.orderId` is opaque (#85 — real FKs — is
open). Both endpoints below are assumed and were reconciled with #5's
`/orders/...` route family.

- `GET /orders/:orderId` → `PatientOrder` — single-order detail for the patient order page, alongside #5's `GET /orders/mine`. Same assumed `404` (not found / not yours) as `GET /orders/:orderId/qualified-facilities`; the UI shows "Order not found", never a permission-error debug path.
- `GET /payments/intents?orderId=<id>` → `PaymentIntent` — the order→intent lookup behind the panel. `404` means "this order has no payment intent" and is mapped to `null` by `payments-service.getPaymentIntentForOrder`; the panel then hides entirely (no empty state, no error). Assumes docforum-core will validate/accept an `orderId` query filter once #85 makes `orderId` a real FK.
- **Timeline times are an assumption:** docforum-core's `PaymentIntent` has only `createdAt`/`updatedAt`, no per-event history. The panel therefore shows `createdAt` for "Payment initiated", `updatedAt` for the current/last step, and no time (`—`) for intermediate steps of a finished payment. If docforum-core ever adds a status-change history, `buildTimeline` in `OrderPaymentPanel.tsx` is the one place to change.
- **Patient-facing by design:** the panel never renders `facilityId`, `patientProfileId`, `escrowId`, or `sorobanContractId` (console-only fields) — covered by tests. Status wording, amount formatting and explorer links all come from the shared patient-payment helpers (`status.ts`, `stroops.ts`, `explorer.ts` — the last being issue #10's helper, same one `PaymentDetailPage` uses), so this screen never drifts from the payment history screens; a `failed` intent additionally tells the patient to contact support and quote the order reference.

### Messaging & attachments (web #22/#23 — assumed, docforum-core #61/#62 not landed yet)
Endpoints used by `src/services/messaging-service.ts`. Everything goes
through `api-client` (hard rule 1); multipart upload is the one exception
to the fetch-only client because `fetch` can't report upload progress —
`apiUpload` in `api-client.ts` uses `XMLHttpRequest`, still confined there.

- `GET /threads/:threadId` → `MessageThread`
- `GET /threads/:threadId/messages?cursor=` → `{ messages: Message[],
  nextCursor: string | null }` (cursor paginated, newest page first)
- `POST /threads/:threadId/messages` (body: `{ body, attachmentIds? }`) → `Message`
- `POST /threads/:threadId/attachments` (multipart, field `file`) →
  `MessageAttachment`
- `GET /threads/:threadId/attachments/:attachmentId/download-url` →
  `{ url, expiresAt }` — a **short-lived signed URL, minted per request**
- `MessageThread` shape: `{ id, appointmentId, status: 'open'|'closed',
  createdAt, updatedAt }`
- `Message` shape: `{ id, threadId, senderProfileId, body,
  attachments: MessageAttachment[], createdAt }`
- `MessageAttachment` shape: `{ id, messageId, fileName, contentType,
  sizeBytes, kind: 'image'|'pdf', createdAt }`

The doctor inbox's per-thread summary is a separate type,
`DoctorMessageThread` (`{ id, patientProfileId, patientName, lastMessageAt,
unreadCount, lastPreview?, waitingMinutes?, closingSoon? }`).

Constraints held in the frontend: signed URLs are **never cached** — the
inline preview holds its URL only in component state, and every click /
download mints a fresh one; message bodies are rendered as text only (PHI,
no HTML); drafts and staged uploads are in-memory only (no
localStorage/sessionStorage); EXIF is never read or displayed here (the
server strips it). The full thread UX (optimistic send, live updates,
per-side layout) is #22's scope — `MessageThread` here is a minimal shared
shell so the attachment composer/preview have a real home.

## Preview builds for pull requests (issue #104)
Every PR is built in mock-API mode and attached to the PR as a downloadable
artifact. It is never published to GitHub Pages or any other shared origin.

- **No shared-origin publishing.** A PR controls its own build (`package.json`,
  `vite.config.ts`, the build commands), so serving its `dist/` from
  `docforum.github.io` would let a contributor run arbitrary JavaScript on the
  same origin as the real app. The build job uploads a private artifact
  instead; reviewers download and serve it locally. `check:preview` is a
  quality gate, **not** the security boundary — the PR controls that script
  too. Not publishing the build is what makes a malicious PR harmless.
- **Fork safety is structural, not conditional.** `pr-preview-build.yml` runs
  on `pull_request` (read-only token, no secrets) and only produces an
  artifact. `pr-preview-comment.yml` runs on `workflow_run` with write access
  but never checks out or executes PR code — it lists the run's artifacts and
  upserts one comment. It resolves the PR from the run's head SHA/branch, so
  fork PRs work even though GitHub leaves `workflow_run.pull_requests` empty.
- **Automatic expiry, no cleanup workflow.** Artifacts expire after 14 days,
  so there is no `gh-pages` branch and no scheduled deletion job.
- **Mock mode in a production build.** `main.tsx` enables the mock API for a
  DEV build with `VITE_ENABLE_MOCKS=true` (local dev) or, outside DEV, when
  `VITE_PREVIEW_MOCKS=true` — only the preview workflow sets the latter. A
  normal `npm run build` still cannot contain mock code, and
  `npm run check:dist` still proves it.
- **Never a real backend.** Previews build with
  `VITE_API_BASE_URL=https://mock-api.invalid` (a reserved-invalid host) and
  `VITE_SENTRY_DSN` empty. `scripts/check-preview-dist.mjs`
  (`npm run check:preview`) fails the build if the mock markers are missing
  or if the real Pages/Render origins appear anywhere in `dist/`.
- **Main deploy unchanged.** `deploy-pages.yml` keeps `contents: read` and
  publishes main with `actions/deploy-pages`; the preview flow never touches
  it.

## Testing utilities & coverage gate (issue #105)
- `src/test/render.tsx` — `renderWithProviders(ui, { route, role, session })`
  wraps a component in a fresh `QueryClient` (retries off, so a failing query
  fails the test), a `MemoryRouter` at a chosen route, and an optional
  signed-in role. `signInAs(role)` and `resetTestStores()` are exported for
  tests that set up state directly; `render` stays as the plain entry point
  used by the existing suites.
- `src/test/factories.ts` — typed factories per model. Ids come from a
  deterministic counter and timestamps from a fixed clock, so assertions on
  generated ids stay stable (`resetFactorySeq()` resets the counter).
- `src/test/server.ts` — a single MSW server over `src/mocks/handlers.ts`,
  started/reset/closed once per run in `src/test/setup.ts` with
  `onUnhandledRequest: 'bypass'` (so the many `vi.mock(service)` tests keep
  working). `src/mocks/handlers.test.ts` shares this server instead of
  creating a second one — two MSW servers in one worker double-intercept
  requests.
- **Coverage gate:** `npm run test:coverage` (v8) measures
  `src/features/**` and `src/services/**` and enforces the thresholds in
  `vite.config.ts`; CI runs that instead of plain `npm test`. Thresholds are
  the floor measured when they were last raised — raise, never lower.

### Shared loading, empty and error states (issue #106)
`src/components/states/` is the one place these live; screens do not hand-roll
them:

- `Skeleton` — placeholder bars, announced through `role="status"` with a
  visually hidden label. The pulse stops entirely under
  `prefers-reduced-motion: reduce` (a static outline, never a blank screen).
- `EmptyState` — the `action` prop is **required**, so an empty state always
  offers the next step (a link when it navigates, a button otherwise).
- `InlineError` — a failed section inside a working screen; optional retry.
- `PageError` — a route whose primary query failed; retry plus an optional
  way out.
- `QueryState` — picks skeleton / error / empty / content from a React Query
  result. Only the **first** load shows a skeleton; a background refetch
  keeps the previous rows on screen. `queryErrorMessage()` turns
  `ApiError`/`ApiTimeoutError` into patient-facing copy.

Empty states added in this change deliberately keep the copy existing tests
assert on (e.g. "No open disputes…", "docforum-core has no background jobs
registered."), so the visual change does not silently rewrite product text.

## Known assumptions (issue #107) — notification centre
Assumed contract: `docforum-core`#93 (Notification model, provider-agnostic
dispatch interface and the in-app inbox API) has not landed. Shapes mirror
`src/types/models.ts` ("Notification centre").

- `GET /notifications?cursor=&limit=` → `{items, nextCursor, unreadCount}`,
  newest first. `unreadCount` is the **inbox-wide** total, not the page's,
  so the bell badge is correct before every page is loaded. The UI never
  counts loaded rows for the badge.
- `POST /notifications/:id/read` → the updated `Notification`.
- `POST /notifications/read-all` → `{updated, unreadCount}`.
- `GET /notifications/stream-ticket` → `{ticket, streamPath, expiresAt}`.
  The SSE URL carries the **ticket, never the access token**: `EventSource`
  cannot send an Authorization header, and a bearer token in a URL leaks into
  logs/history/Referer. The ticket is single-use and short-lived.
- Stream events are `notification` (`{notification, unreadCount}`) and `read`
  (`{notificationIds, unreadCount}`). `parseStreamEvent` ignores malformed or
  unknown messages instead of tearing down the stream, and the hook stops
  reconnecting after two attempts so a blocked proxy cannot cause a retry
  storm — the 60 s refetch in `useNotifications` is the fallback.
- `Notification.kind` is open-ended: known kinds map to an icon and a
  role-aware deep link (`notification-meta.ts`); unknown kinds render a
  generic bell + "Update" chip and link only to a payload `link` that passes
  `safeAppPath` (app-relative only — no protocol-relative or absolute URLs, so
  a hostile payload cannot become an open redirect).
- **PHI-light by design:** `title`/`body` are display strings written by the
  backend, rendered as text only. Cross-tab broadcasts carry ids and the same
  payload the other tab already has; nothing is persisted in localStorage.

### New-notification announcements and quiet hours (issue #246)

The bell announces increases in the server's `unreadCount`. It assumes quiet
hours (#108) are applied by docforum-core when a notification is delivered, as
the quiet-hours setting describes ("Pause non-urgent email, SMS and in-app
notifications"). A notification that reaches the in-app inbox was meant to be
seen now, so the client announces it and does not apply quiet hours a second
time. Doing so would also mute the safety-critical results and security alerts
that must get through. The preference model has no separate setting to silence
in-app screen-reader announcements. If one is added, the hook should read it.
Announcements contain only counts, never notification titles or bodies.

## Roadmap / status
See `ROADMAP.md` in this repo, and Phase 7 in `docforum-core`'s
`ROADMAP.md` for the original (pre-split) frontend phase this was carved
out of.

## Known assumptions (Phase W2 orders — issue #25, added 2026-10-15)

These are assumed contracts against `docforum-core` issue #71 (verifiable
order tokens). Reconcile `src/types/models.ts` and `src/services/orders-service.ts`
once those endpoints ship.

### `GET /orders/:id` — order detail
```json
{
  "id": "string",
  "type": "prescription" | "lab_order",
  "status": "active" | "superseded" | "expired" | "fulfilled" | "cancelled",
  "token": "string | null",
  "items": [{ "name": "string", "note": "string?" }],
  "issuedAt": "ISO 8601",
  "expiresAt": "ISO 8601 | null",
  "doctorName": "string",
  "facilityName": "string | null",
  "patientProfileId": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

Key constraint: `token` is `null` for any order whose `status` is not
`active`. The frontend enforces this by refusing to render a QR for any
order with a null token or a non-active status — the facility scan is only
meaningful against the current, valid order.

### `GET /orders/mine` — list patient's own orders
```json
[
  { /* same shape as GET /orders/:id */ }
]
```

Route is guarded with a valid `Authorization: Bearer <accessToken>` header;
returns only the authenticated patient's orders.
