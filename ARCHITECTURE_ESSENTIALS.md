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
- `src/mocks/` — MSW mock API for `npm run dev:mock` (issue #95). Handlers
  mirror the same real/assumed contracts `src/services/` calls, over
  obviously fake `example.test` fixtures. Loaded only behind the
  `import.meta.env.DEV && VITE_ENABLE_MOCKS` guard in `main.tsx`, before
  the first render; production bundles must never contain it — CI enforces
  this via `npm run check:dist`. When an assumed contract in this file is
  reconciled, update `src/mocks/` fixtures/handlers in the same PR.
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

## Known assumptions

- **Platform theming & preference storage**: Theme preferences (`light`, `dark`, or `high-contrast`) are saved in `localStorage` under the key `docforum-theme`. If no explicit choice is stored, the UI automatically falls back to system media queries (`prefers-color-scheme: dark` and `prefers-contrast: high`). A pre-hydration inline script in `index.html` inspects this state immediately to set the `data-theme` attribute on `<html>`, preventing pre-hydration white flash on load.

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

#### Care thread timeline (issue #28)
- `GET /patients/:patientProfileId/care-threads` → `CareThread[]`
- `GET /care-threads/:id` → `CareThread`
- Aggregates appointments, consultations, referrals, orders, fulfillment, and escrow payment settlement into a single continuous journey timeline.
- Progressive rendering and graceful degradation when modules are not yet implemented.

#### Facility finder with distance sorting (docforum-core#74, issue #29)
- `GET /facilities?type=&lat=&lng=&query=` → `FacilityWithDistance[]`
- OpenStreetMap tiles with attribution.
- Patient location is requested with transparent consent, kept strictly in transient memory, and NEVER persisted to storage or URLs.

### Phase W3 — Doctor core flow (assumed, not yet in docforum-core)

These shapes back issues #45–#49. docforum-core issues #61 (message thread),
#129 (in-person check-in / live queue position) and the today's-appointments
consultation contracts are not landed yet, so the endpoints below are the
smallest reasonable assumption and must be reconciled once the real API
exists.

#### Today's appointments & live queue (issue #49, depends on #6)
- `GET /doctor/appointments/today` → `Appointment[]` — today's appointments for the signed-in doctor, ordered by `startsAt`.
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
- `POST /facilities/:facilityId/fulfillment-queue/:itemId/action` (body: `{action: 'fulfilled' | 'rejected', notes?}`) → `FulfillmentQueueItem` — records the acting staff user's identity and role for PRD §7 audit trail.

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

## Roadmap / status
See `ROADMAP.md` in this repo, and Phase 7 in `docforum-core`'s
`ROADMAP.md` for the original (pre-split) frontend phase this was carved
out of.
