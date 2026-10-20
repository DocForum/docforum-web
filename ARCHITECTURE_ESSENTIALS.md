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

### Shared form system (issue #102)

- **Layer:** `react-hook-form` + `zod` schema validation, providing consistent,
  accessible errors across forms and less hand-rolled state per form.
- **Primitives:** `src/components/form/FormField.tsx` wraps `TextField` and
  wires it to react-hook-form via `useController`. Field errors (zod-produced
  or server-mapped) are associated through `aria-describedby`/`aria-invalid`
  and rendered by `TextField`'s existing error paragraph. `useFormContext` /
  `FormProvider` scope each form.
- **Schema validation:** `src/hooks/useZodForm.ts` wraps `useForm` with a
  `zodResolver`. Schemas live alongside their forms (login, signup, wallet
  link, create payment intent) and use descriptive messages matching the
  previous hand-rolled validators.
- **Migrated forms:** login (`src/features/auth/components/LoginForm.tsx`),
  signup (`src/features/auth/components/SignupForm.tsx`), wallet link
  (`src/features/payments/components/WalletLinkForm.tsx`), and create payment
  intent (`src/features/payments/components/CreatePaymentIntentForm.tsx`).
- **Focus to first error:** react-hook-form's `handleSubmit` focuses the
  first invalid field on a failed submit.
- **Server error mapping:** `src/utils/form.ts` `mapServerErrors` maps a
  docforum-core `VALIDATION_FAILED` body onto `field -> message` records,
  applied via `form.setError(field, { message })`. Assumed server shape
  (to be reconciled against the real API contract):
  `{ details: [{ field: string, message: string }] }` or a bare array of
  `{ field, message }`.

## Roadmap / status
See `ROADMAP.md` in this repo, and Phase 7 in `docforum-core`'s
`ROADMAP.md` for the original (pre-split) frontend phase this was carved
out of.
