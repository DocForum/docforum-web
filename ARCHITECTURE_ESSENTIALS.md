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
2. Mirror `docforum-core`'s data model shapes in `src/types/models.ts` —
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
- `src/pages/` — route-level components.
- `src/store/` — Zustand stores. Auth and acting-for state are in memory.

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

## API client behaviour (issue #123)
`src/services/api-client.ts` is the only place HTTP lives, and it now owns
the full request lifecycle — services pass options through, never wire
`fetch` themselves:

- **Timeouts.** Every request has a budget: `DEFAULT_TIMEOUT_MS` (60 s,
  deliberately longer than docforum-core's ~1 minute cold start so the
  `useSlowRequestHint` message at 4 s explains a wait that then *succeeds*
  instead of being killed mid-cold-start), or `SLOW_REQUEST_TIMEOUT_MS`
  (120 s) for the genuinely slow endpoints (`POST /account/data-export`,
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
  kicked off by `main.tsx` without blocking first render. `RequireAuth`
  shows a `Restoring your session…` state while the store's `status` is
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
  redirect (e.g. `RequireAuth` on the page being left) can win the
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

#### Data export (docforum-core#40, issue #26)
- `POST /account/data-export` (body: `{password}`) → `DataExport`
- `GET /account/data-export` → `DataExport | null`
- `GET /account/data-export/:id/download` → file stream (`application/json`)
- `DataExport` shape: `{id, patientProfileId, status: 'pending'|'processing'|'ready'|'expired'|'failed', requestedAt, readyAt?, expiresAt?, fileSizeBytes?, downloadUrl?, errorMessage?}`
- Ready exports expire after 24 hours. Downloads require bearer authorization and avoid keeping export contents in memory.

#### Account deletion (docforum-core#41, issue #27)
- `POST /account/delete` (body: `{password, confirmation: 'DELETE'}`) → `{success, message, deletedAt}`
- Clinical and statutory retention: identity credentials (name, email, password hashes, guardian links) are permanently scrubbed/anonymized. Clinical consultation notes, diagnostic orders, and cryptographic payment/escrow records are retained by law in de-identified form.
- Deletion is blocked if there are active orders or unreleased funded escrows.
- Client clears all QueryClient cache and Zustand session/profile state.

#### Closure calendar management (this PR)
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

### Phase W3 — Doctor core flow (assumed, not yet in docforum-core)

These shapes back issues #6, #7 and #45–#49. docforum-core issues #61 (message
thread), #129 (in-person check-in / live queue position) and the
today's-appointments/consultation contracts are not landed yet, so the
endpoints below are the smallest reasonable assumption and must be reconciled
once the real API exists.

#### Today's appointments & live queue (issues #6 and #49)
- `GET /doctor/appointments/today` → `Appointment[]` — today's appointments for the signed-in doctor, ordered by `startsAt`.
- `GET /appointments/:id/intake` → `IntakeForm | null` — the structured intake the patient submitted for that appointment. `404` means no intake was submitted; the UI shows that as an empty state, not an error. The endpoint is doctor-scoped: it must only return intake for appointments assigned to the signed-in doctor.
- `IntakeForm` shape: `{id, appointmentId, patientProfileId, submittedAt, chiefComplaint, symptomDuration?, severity?: number|null (0–10), currentMedications: string[], allergies: string[], notes?}`.
- `GET /doctor/queue/today` → `QueueEntry[]` — checked-in patients in queue order (computed server-side from `checkInAt`).
- `POST /appointments/:id/start` → `Appointment` — marks a checked-in visit `in_progress` (sets `startedAt`). Idempotent if already started.
- `POST /appointments/:id/complete` → `Appointment` — marks an in-progress visit `completed` (sets `completedAt`).
- `GET /doctor/queue/running-delay` → `RunningDelay` — computed delay from the current in-progress visit vs its scheduled end, plus any manual override.
- `PATCH /doctor/queue/running-delay` (body: `{manualOverrideMin?: number | null}`) → `RunningDelay` — set/clear a manual "running late by X min" override.

Undo behaviour: start/complete are applied optimistically and can be reverted within a short undo window (a few seconds) by re-calling the inverse action or clearing the optimistic timestamp; the UI surfaces an undo toast.

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

## Known assumptions

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
- `VITE_USE_HASH_ROUTER=true` → `HashRouter`; absent or `false` → `BrowserRouter`.
- GitHub Pages builds always pass `VITE_USE_HASH_ROUTER: "true"` (set in `deploy-pages.yml`).
- `HashRedirectShim` is mounted only in BrowserRouter mode; it reads `window.location.hash` directly to detect `#/` prefixes on the root path.
- Email links from docforum-core should use clean paths (`/reset?token=…`), not hash paths. Old hash-format links are transparently redirected by the shim.

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
