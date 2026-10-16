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

## Known assumptions — Phase W2 (dependents, health profile, acting-for)

These API shapes are assumed and not yet implemented in `docforum-core`.
Reconcile against the real contract once the corresponding backend issues
land.

### Dependents (docforum-core#42)
- `GET /patients/me/dependents` → `Dependent[]`
- `POST /patients/me/dependents` (body: `{fullName, dateOfBirth, relationship}`) → `Dependent`
- `PATCH /patients/me/dependents/:id` (body: `{fullName, dateOfBirth, relationship}`) → `Dependent`
- `POST /patients/me/dependents/:id/handover-invite` (body: `{email}`) → `Dependent`
- `POST /patients/me/dependents/:id/handover-invite/resend` → `Dependent`
- `POST /auth/claim-account` (body: `{token, email, password}`) → `void`
- `Dependent` shape: `{id, guardianProfileId, fullName, dateOfBirth, relationship: 'parent'|'guardian'|'carer', handoverStatus: 'not_eligible'|'eligible'|'invited'|'claimed', claimEmail?, claimInviteExpiresAt?, createdAt, updatedAt}`

### Health profile (docforum-core#59)
- `GET /patients/:profileId/health/:section` → `HealthEntry[]`
- `POST /patients/:profileId/health` (body: `{section, name, details?}`) → `HealthEntry`
- `PATCH /patients/:profileId/health/:entryId` (body: `{name, details?}`) → `HealthEntry`
- `DELETE /patients/:profileId/health/:entryId` → `void`
- `HealthEntry` shape: `{id, patientProfileId, section: 'allergies'|'conditions'|'medications', name, details?, version, previousValue?, updatedAt, createdAt}`

### Acting-for profile switcher (#20)
No new backend endpoint. The switcher is client-only UI state (Zustand
store). Every patient API call and React Query key includes the selected
`patientProfileId` so caches never mix profiles.

### Care hub — patient home (#33)
No new backend endpoint and no new assumed shape. The hub is a
client-side aggregation over the two contracts above —
`GET /patients/me/dependents` and `GET /patients/:profileId/health/:section`
— ranked into sections in `src/features/care-hub/ranking.ts`. The derived
`CareCard` is deliberately a presentation-only type (it exists in the
browser and is never sent to or received from `docforum-core`), so it does
not violate hard rule 2.

Two things the issues ask for are not yet wired because their backend
contract does not exist here:
- **There is no way to learn the signed-in patient's own `patientProfileId`.**
  `#20`'s profile store is populated only by tests — no response in this
  repo carries an `ActingProfile`, and `User` has no profile id — so
  `selectedProfileId` is `null` in a real session and every health-profile
  query stays disabled. That is a `docforum-core` gap to file (hard rule 1),
  not something to paper over by assuming `profileId === userId`. The care
  hub reports such a source as `unavailable` rather than loading or failed,
  so the screen renders the cards it *can* derive instead of spinning
  forever, and never reads "we could not ask" as "you have nothing saved".
  The health editor and dependents screens have the same dependency.
- **Referrals awaiting acceptance, orders needing a facility, results
  ready, waitlist offers, follow-ups** wait on `docforum-core`#5–#16
  (see issues #4 and #5 here). Each will contribute its own card source
  when that lands.

"Coming up" is no longer one of those: since #32 it is fed by
`useMyAppointments()`, which reads `docforum-core`'s **real**
`GET /appointments/mine` (see below), so a visit happening today ranks under
"Action needed" and a later one under "Coming up" in a real session — the
appointments source needs only the access token, not a `patientProfileId`.

## Known assumptions — Phase W2 patient follow-ons (#32, #34, #37)

Everything under "assumed" below is a shape this repo *wrote down*, not one
`docforum-core` serves yet; each screen treats a 404 as "not available for
this deployment yet", never as "you have nothing". Reconcile against the real
contract when the backend issues land.

### Appointments — the real part (`docforum-core` Phase 1)
- `GET /appointments/mine` (Bearer access token) → a **bare array**, not an
  envelope, newest-first, each item with `availabilitySlot` included
  (`{id, doctorProfileId, status, startTime, endTime, createdAt, updatedAt}`).
- `AppointmentStatus` is `scheduled | completed | cancelled | no_show` —
  there is **no** `checked_in`/`being_seen` in the real enum, which is why
  queue state lives in its own shape below rather than in `status`.
- `AppointmentOrigin` is `direct_booking | referral`; `SlotStatus` is
  `open | held | booked`.
- **Still-missing from this real endpoint: no clinician name and no facility
  name.** It returns `doctorProfileId` only, so every visit card and the
  appointment detail page describe the *time*, never "Dr —". Putting a name
  there needs a `docforum-core` change (include the doctor profile, or a
  patient-facing summary route); this repo will not resolve a name by
  guessing from an id.

### Check-in and live queue (#32, assumed — `docforum-core` #129)
- `GET /appointments/:appointmentId/queue` → `AppointmentQueue`
- `POST /appointments/:appointmentId/check-in` → `AppointmentQueue`
- Both are keyed by an appointment id the patient already owns:
  `AppointmentDetailPage` only asks for a queue after matching that id
  against the real `GET /appointments/mine` list, so an unfamiliar id reads
  "we cannot find that appointment on your account" and never reaches the
  queue route at all. Authorising the id itself is still `docforum-core`'s
  job.
- `AppointmentQueue` shape: `{appointmentId, phase: 'not_open'|'waiting'|'being_seen'|'completed', peopleAhead: number|null, estimatedWaitMinutes: number|null, checkInOpensAt: string|null, checkedInAt: string|null}`
- `null` in `peopleAhead`/`estimatedWaitMinutes` means "not published", and
  is rendered as such — `0` would be a claim about the waiting room.
- Polling, not SSE: `refetchInterval` 15s while the panel is on screen, and
  `gcTime: 0` so unmounting the page stops the requests. `docforum-core` has
  no SSE endpoint to hook to yet.

### 'Who viewed my records' access log (#34, assumed — `docforum-core` #45)
- `GET /patients/me/access-log?from&to&recordType&cursor` → `AccessLogPage`
- `AccessLogPage` shape: `{events: AccessLogEvent[], nextCursor: string|null}`
- `AccessLogEvent` shape: `{id, occurredAt, actorRole: 'doctor'|'facility'|'patient'|'admin', actorName, recordType: 'health_profile'|'appointment'|'referral'|'order'|'dependent', reason: 'consultation'|'order_fulfillment'|'result_delivery'|'handover_claim'|'support'}`
- The `me` scope is used because, again, the frontend cannot learn its own
  `patientProfileId` (the gap above) — an id in the path would have to be
  guessed.
- The "report a concern" link is gated on `VITE_SUPPORT_EMAIL` — no address
  configured means no link, not a `mailto:` to an invented one.

### Payment history and receipts (#37, partly real)
- **Real today:** the `PaymentIntent` row itself — `{id, orderType, orderId,
  status, patientProfileId, facilityId, amountStroops, escrowId,
  stellarTxHash, sorobanContractId, createdAt, updatedAt}` — with the BigInt
  columns (`amountStroops`, `escrowId`) serialized to **strings**. Those
  strings are kept as strings in `models.ts` and converted with `BigInt`
  only (`src/features/payments/stroops.ts`); `Number` would round a payment
  above 2^53 stroops.
- **Real today, admin-only:** `POST /payments/intents*` and
  `GET /payments/intents/:id` require the `admin` role, which is why the
  patient screens below are separate.
- Assumed (`docforum-core` #90 has not landed):
  - `GET /payments/mine?cursor` → `PaymentHistoryPage`
  - `GET /payments/mine/:intentId` → `PaymentHistoryEntry`
  - `PaymentHistoryEntry extends PaymentIntent` with optional
    `facilityName?: string` and `refundDeadlineAt?: string` — presentation
    extras layered *on top of* the mirrored row, not a parallel shape (hard
    rule 2). Both are omitted from the UI when absent.
  - `patients` routes in `docforum-core` are still a placeholder module, so
    every `me`-scoped patient endpoint above is a request, not a report.
- `src/features/payments/explorer.ts` builds testnet explorer links from
  `VITE_STELLAR_EXPLORER_BASE_URL` (default
  `https://testnet.stellar.expert/explorer/public`). This is display-only:
  nothing here queries Stellar (hard rule 1) — it turns a hash
  `docforum-core` already returned into a URL.

### Cursor pagination (assumed across #34 and #37)
`docforum-core` has **no** cursor-pagination helper in `main` — the one
patient list that does exist, `GET /appointments/mine`, returns a bare
array. The `{ <collection>: [], nextCursor: string|null }` envelope used by
the access log and payment history is therefore an assumption, and the
frontend treats `nextCursor: null` as "nothing older". If the backend lands
offset pagination instead, only the two services and their
`getNextPageParam` need to change.

### New routes from these three issues
- `/patient/appointments/:appointmentId` — nested under the patient
  dashboard, because it is a detail screen of the hub.
- `/account/access-log`, `/payments`, `/payments/:intentId` — **not** nested
  under `/patient`. `#34` names `/account/access-log` in the issue body and
  payments are not patient-profile-scoped UI (a doctor or facility arriving
  at `/payments` later would not belong under `/patient`), so these sit at
  the literal paths the issues ask for, gated on the `patient` role in
  `src/App.tsx` until a role actually needs them.
- All three lists are `useInfiniteQuery`-based; the patient asks for older
  entries, the page never fetches ahead on its own.

## Roadmap / status
See `ROADMAP.md` in this repo, and Phase 7 in `docforum-core`'s
`ROADMAP.md` for the original (pre-split) frontend phase this was carved
out of.
