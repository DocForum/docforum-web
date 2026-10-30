# ROADMAP.md — docforum-web

> Update this file on every contribution that starts/completes/blocks an
> item below — same rule as the rest of the org, see `AGENTS.md`.

**Status: Phase W1 complete and connected to a live backend.** The deployed
Pages preview (https://docforum.github.io/docforum-web/) points at
`docforum-core`'s Render deployment; signup/login/reload/logout work
end-to-end. See `ARCHITECTURE_ESSENTIALS.md` "Known gaps against the real
API" for the one documented local-dev cookie caveat.

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
- [x] Invite landing + redemption for admins and facility staff. Tracked
  as [issue #81](https://github.com/DocForum/docforum-web/issues/81)
  (High, 200 pts) — `InvitePage` at `/invite?token=` +
  `src/features/invite/`. Validates the token, shows the inviting
  organisation, role and inviter, and creates the account with the
  invite's role (never a form field, never in the request payload) or
  lets an already-signed-in user accept with one click (existing users
  are routed through `/login` and back to the invite via router state).
  Clear expired / revoked / already-used / not-found states. The token
  is read from the URL once and immediately stripped. **Built against
  assumed shapes:** docforum-core#39 (admin invites) and #75 (facility
  staff invites) haven't landed — see `ARCHITECTURE_ESSENTIALS.md`
  "Known assumptions".
- [x] Idle timeout & automatic sign-out for shared devices. Tracked as
  [issue #82](https://github.com/DocForum/docforum-web/issues/82)
  (High, 200 pts) — `src/hooks/idle-timeout.ts` (pure timestamp logic) +
  `src/hooks/useIdleTimeout.ts`, `SessionTimeoutWarning` /
  `SessionTimeoutController` mounted in `Layout`. Timestamp-based
  activity tracking (input, focus, visibility — never
  interval-counting, so throttled background tabs stay correct), a
  warning modal with "Stay signed in", cross-tab `BroadcastChannel`
  coordination, and role-based defaults (patient 30 min, doctor/facility
  15 min, admin 10 min) with a backend value taking precedence when
  served. On timeout: API logout, ALL client state cleared, then
  `/login?reason=idle-timeout` with an explanation. Unsaved form data is
  flagged in the modal via `useUnsavedChangesWarning`. **Built against
  assumed shape:** `GET /auth/session-timeout` (not in docforum-core) —
  see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
- [ ] Restore session on reload via `POST /auth/refresh` (single-flight refresh, one retry on `401`, `RequireAuth` waits for boot refresh). Tracked as [issue #9](https://github.com/DocForum/docforum-web/issues/9) (Medium, 150 pts).
- [ ] Not done: any integration test against a real `docforum-core`
  instance. Tracked as [issue #12](https://github.com/DocForum/docforum-web/issues/12) (High, 200 pts) — an end-to-end smoke test against a throwaway `docforum-core` backend.
- [x] ESLint + lint step in CI. Tracked as [issue #11](https://github.com/DocForum/docforum-web/issues/11) (Trivial, 100 pts).
- [x] Deployed as a UI preview to GitHub Pages on every push to `main`
  (`.github/workflows/deploy-pages.yml`) — see `ARCHITECTURE_ESSENTIALS.md`
  "Deployment". Not a production deploy decision for the org; scoped to
  this repo's static frontend only.

## Phase W2 — Patient core flow
**Fully scoped into issues #1–#5, #18–#23, #26–#29, plus the follow-on patient issues #32–#34 and #37.**
- [ ] Doctor search (specialty + availability filter). Tracked as [issue #1](https://github.com/DocForum/docforum-web/issues/1) (Medium, 150 pts) — built against a documented assumed API shape, since `docforum-core` has no doctor-list endpoint yet. The doctor-search page itself (`/patient/search`, `src/features/search/`, `src/services/search-service.ts`, mock handlers + fixtures) landed with [issue #30](https://github.com/DocForum/docforum-web/issues/30)'s symptom-based search; what remains for #1 is standalone specialty browsing without a symptom.
- [x] Symptom-based doctor search with accessible autocomplete. Tracked as [issue #30](https://github.com/DocForum/docforum-web/issues/30) (High, 200 pts) — WAI-ARIA combobox against `docforum-core`'s controlled symptom vocabulary (docforum-core#60), debounced with in-flight requests cancelled on new keystrokes, "Showing doctors in X and Y" mapping line, availability filter combined with the symptom and kept in the URL, and a no-match state that always offers a way forward.
- [ ] Booking + intake form. Tracked as [issue #2](https://github.com/DocForum/docforum-web/issues/2) (High, 200 pts) — must handle the `409` slot-taken response from `docforum-core`'s real booking-concurrency guarantee explicitly, not as a generic error.
- [ ] My appointments list. Tracked as [issue #3](https://github.com/DocForum/docforum-web/issues/3) (Trivial, 100 pts) — calls `docforum-core`'s real, already-implemented `GET /appointments/mine`, no assumption involved.
- [ ] Referral accept/decline screen. Tracked as [issue #4](https://github.com/DocForum/docforum-web/issues/4) (Medium, 150 pts) — assumed contract against `docforum-core` issues #5–#8, not yet merged there.
- [x] Orders list + facility-selection screen. Tracked as [issue #5](https://github.com/DocForum/docforum-web/issues/5) (Medium, 150 pts) — `src/features/orders/`, `OrdersPage` at `/patient/orders`. Lists every current prescription/lab order with superseded-version history derived from the supersedes chain (never "first record wins"), and lets the patient choose a fulfilling facility from only the capability-matched options docforum-core returns. Built against an assumed contract; see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W2".
- [x] Order detail with verifiable QR code and print-friendly view. Tracked as [issue #25](https://github.com/DocForum/docforum-web/issues/25) (High, 200 pts) — **implemented**: `src/features/orders/`, `src/pages/OrderDetailPage.tsx`, routed at `/patient/orders/:orderId`. Built against an assumed `GET /orders/:id` + `GET /orders/mine` contract (docforum-core issue #71). See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
- [x] Health profile editor: allergies, conditions and current medications. Tracked as [issue #18](https://github.com/DocForum/docforum-web/issues/18) (High, 200 pts) — assumed contract against `docforum-core` issue #59.
- [x] Dependents management for guardians. Tracked as [issue #19](https://github.com/DocForum/docforum-web/issues/19) (High, 200 pts) — assumed contract against `docforum-core` issue #42.
- [x] Acting-for profile switcher: book and view records on behalf of a dependent. Tracked as [issue #20](https://github.com/DocForum/docforum-web/issues/20) (High, 200 pts) — client-only UI state (Zustand), threads `patientProfileId` through API calls and query keys.
- [x] Guardian consent and age-of-majority handover screens. Tracked as [issue #21](https://github.com/DocForum/docforum-web/issues/21) (High, 200 pts) — assumed contract against `docforum-core` issue #42.
- [x] Message attachments: upload with progress, preview and secure download. Tracked as [issue #23](https://github.com/DocForum/docforum-web/issues/23) (High, 200 pts) — assumed contract against `docforum-core` issues #61/#62. Includes a minimal shared thread shell (`MessageThread`) so the attachment composer/preview have a real home; the full thread UX (optimistic send, live updates, pagination states) remains [issue #22](https://github.com/DocForum/docforum-web/issues/22).
- [x] Download my data: request, track and fetch a data export. Tracked as [issue #26](https://github.com/DocForum/docforum-web/issues/26) (High, 200 pts) — assumed contract against `docforum-core` issue #40.
- [x] Account deletion flow with clear retention explanation. Tracked as [issue #27](https://github.com/DocForum/docforum-web/issues/27) (High, 200 pts) — assumed contract against `docforum-core` issue #41.
- [x] Care thread timeline: one view from booking to results. Tracked as [issue #28](https://github.com/DocForum/docforum-web/issues/28) (High, 200 pts).
- [x] Facility finder with a map and distance-sorted results. Tracked as [issue #29](https://github.com/DocForum/docforum-web/issues/29) (High, 200 pts) — assumed contract against `docforum-core` issue #74.


- [x] Patient home as a care hub: action-first dashboard ranking what needs
  attention now. Tracked as [issue #33](https://github.com/DocForum/docforum-web/issues/33) (High, 200 pts) — no new backend contract; aggregates the
  dependents and health-profile endpoints above. Its "Coming up" section is fed
  by the appointment cards below, which read `docforum-core`'s real
  `GET /appointments/mine`; a dedicated appointments list screen
  ([issue #3](https://github.com/DocForum/docforum-web/issues/3)) is still open.
- [x] Check-in and live queue position on appointment day. Tracked as [issue #32](https://github.com/DocForum/docforum-web/issues/32) (High, 200 pts) — the visit itself comes from `docforum-core`'s real `GET /appointments/mine`; the queue, check-in and its window are an assumed contract against `docforum-core` issue #129, which has not landed.
- [x] 'Who viewed my records' access log. Tracked as [issue #34](https://github.com/DocForum/docforum-web/issues/34) (High, 200 pts) — assumed contract against `docforum-core` issue #45 (PHI read-access log), which has not landed.
- [x] Payment history and receipts for patients. Tracked as [issue #37](https://github.com/DocForum/docforum-web/issues/37) (High, 200 pts) — `PaymentIntent` mirrors `docforum-core`'s real Phase 5.5 shape (`amountStroops`/`escrowId` arrive as strings and are formatted with BigInt, never through `Number`); the patient list/detail routes and the `refundDeadlineAt`/`facilityName` display fields are an assumed contract against `docforum-core` issue #90, which has not landed.
## Phase W3 — Doctor core flow
**Fully scoped into issues #6–#7, with #45–#49 added as doctor core-flow features.**
- [x] Today's appointments / intake view. Tracked as [issue #6](https://github.com/DocForum/docforum-web/issues/6) (Medium, 150 pts) — `src/features/doctor-today/`, `TodayAppointments` on the doctor dashboard. Lists today's appointments in start-time order and expands each row to the patient's structured intake (lazy-loaded per appointment, with a "no intake submitted" state and doctor-scoped privacy note). Built against an assumed intake contract; see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W3".
- [x] Consultation screen (notes, outcome, referral/order issuance). Tracked as [issue #7](https://github.com/DocForum/docforum-web/issues/7) (High, 200 pts) — `src/features/consultation/` now includes `ConsultationOutcomePanel` under the note editor: outcome (`resolved`/`referred`/`follow_up_needed`), conditional referral specialty/reason or follow-up days, and an optional single prescription/lab order issued in the same submission. Uses the note draft as consultation notes, records sequentially with partial-success handling, and mocks all three assumed endpoints.
- [x] Doctor live queue: start and complete visits, running delay with manual override and undo window. Tracked as [issue #49](https://github.com/DocForum/docforum-web/issues/49) (High, 200 pts) — `src/features/queue/`, `QueuePanel`, optimistic start/complete with a 4s undo toast.
- [x] Doctor messages inbox across all patient threads. Tracked as [issue #47](https://github.com/DocForum/docforum-web/issues/47) (High, 200 pts) — `src/features/messaging/`, `DoctorInbox`, `UnreadBadge`, unread counts, truncated PHI previews, oldest-unanswered-first sorting, filters, pagination.
- [x] Doctor command palette and keyboard shortcuts. Tracked as [issue #46](https://github.com/DocForum/docforum-web/issues/46) (High, 200 pts) — `src/components/CommandPalette.tsx`, `src/hooks/useKeyboardShortcuts.ts`, shortcuts help dialog, input suppression.
- [x] Doctor practice insights: utilisation, no-shows and turnaround. Tracked as [issue #50](https://github.com/DocForum/docforum-web/issues/50) (High, 200 pts) — `src/features/insights/`, `DoctorPracticeInsightsPage`, slot utilisation by week, no-show/late-cancel rates, referral turnaround, message response time; charts with accessible table alternatives; date range selector; small-sample caveats; doctor-only data (no peer comparisons).

## Phase W4 — Facility core flow
**Fully scoped into issues #8, #51, #52, #53, and #54.**
- [x] Facility staff accounts: invite, list and remove. Tracked as [issue #51](https://github.com/DocForum/docforum-web/issues/51) (High, 200 pts) — `src/features/facility-team/`, `FacilityTeamPage`, owner staff invite by email with fixed roles, pending invites with resend/revoke, member removal with backend session revocation and last-owner protection, read-only staff view, and fulfillment queue action attribution (PRD §7).
- [x] Scan-to-verify orders with the device camera. Tracked as [issue #52](https://github.com/DocForum/docforum-web/issues/52) (High, 200 pts) — `src/features/order-verify/`, `OrderVerifyPage` (`/facility/verify`), camera QR scanning via BarcodeDetector API with JS fallback, verified order states (`valid`, `superseded`, `expired`, `fulfilled`, `not_eligible`), instant jump into fulfillment queue, manual token entry fallback, camera permission and stream teardown, and 429 rate limit error handling.
- [x] Facility payout ledger with per-order escrow status and terms. Tracked as [issue #53](https://github.com/DocForum/docforum-web/issues/53) (High, 200 pts) — `src/features/payments/`, `FacilityPaymentsPage` (`/facility/payments`), cursor-paginated ledger, escrow totals cards (held, released, refunded), BigInt-safe amount formatting for Stellar stroops across assets (XLM vs USDC), plain-language escrow terms with releasers and refund countdowns, approaching deadline warnings (< 48h), and Stellar Expert testnet transaction explorer links.
- [x] API keys and webhooks management for facility system integrations. Tracked as [issue #55](https://github.com/DocForum/docforum-web/issues/55) (High, 200 pts) — `src/features/integrations/`, `FacilityIntegrationsPage` (`/facility/integrations`). API keys list/prefix/created/last-used, create with a one-time secret (copy + warning, dropped from the mutation cache and DOM on close), revoke; webhook endpoints with URL/events, one-time HMAC signing secret, send-test and recent deliveries with status/redelivery; owner-only. Built against assumed contracts for `docforum-core`#125/#126 — see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W4".
- [x] Fulfillment queue. Tracked as [issue #8](https://github.com/DocForum/docforum-web/issues/8) (Medium, 150 pts) — `src/features/facility-queue/`, `FacilityQueuePanel` on `/facility`. Live queue with all/needs-action/done filters, status transitions (`pending` → `in_progress` → `fulfilled`/`rejected`), terminal-item protection, and staff attribution retained from #51.
- [x] Mark fulfilled/rejected, attach lab result. Folded into issue #8 above — real multipart file upload for lab orders (PDF/JPEG/PNG, 10 MB max) through `apiFetchForm`; no URL field and no provider-specific storage fields. Assumed upload and `FulfillmentRecord` caveats recorded in `ARCHITECTURE_ESSENTIALS.md`.
- [x] Partial fulfilment: dispense some items and route the rest elsewhere. Tracked as [issue #54](https://github.com/DocForum/docforum-web/issues/54) (High, 200 pts) — `src/features/fulfillment/` and `src/features/orders/`, item-level quantities on the facility queue with per-item dispense/reject, derived `partially_fulfilled` order badges, patient order list (`/patient/orders`) and detail (`/patient/orders/:orderId`), "Get remaining items elsewhere" routing with eligible-facility picker, dispensed-elsewhere items clearly blocked/disabled, 409 handling when another facility dispensed first, and backend-supplied payment-release rules shown verbatim (no client-side release calculation; pending docforum-core#73).

## Phase W5 — Payments UI
**Built — `docforum-core` Phase 5.5 shipped for real (custodial v1, its docs/adr/0004), so the two-layer blocker (escrow-escrow SDK → docforum-core → here) cleared.** Every call from this repo goes through `docforum-core`'s real API — hard rule 1 (no direct Stellar calls here) held throughout.
- [x] Wallet link screen (calls `docforum-core` API only, per
  `ARCHITECTURE_ESSENTIALS.md` hard rule 1 — no direct Stellar calls
  here). `src/features/payments/components/WalletLinkForm.tsx`, wired
  into `FacilityDashboardPage` — a facility links the Stellar address
  `docforum-core` pays out to.
- [ ] Patient wallet connection with SEP-10 verification and privacy notice.
  Tracked as [issue #58](https://github.com/DocForum/docforum-web/issues/58),
  blocked until `docforum-core` delivers the SEP-10 and verified wallet-link
  contracts in [#77](https://github.com/DocForum/docforum-core/issues/77) and
  [#78](https://github.com/DocForum/docforum-core/issues/78). No frontend
  endpoint or wallet-verification shape is assumed before those dependencies
  are implemented.
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
- [x] Payment status panel on patient orders (custodial mode). Tracked as [issue #61](https://github.com/DocForum/docforum-web/issues/61) (High, 200 pts) — patient order detail page `/patient/orders/:orderId` (`src/pages/OrderDetailPage.tsx`, linked from #5's orders list) with a payment panel (`src/features/payments/components/OrderPaymentPanel.tsx`) showing the intent's status in plain language with a timeline for all five states (created/not funded, escrowed/held, released, refunded, failed → contact support). The panel hides entirely when the order has no payment intent; a failed payment lookup degrades to a quiet note instead of breaking the page. Reuses issue #5's `PatientOrder` shape and the shared patient-payment helpers — `status.ts` copy, `stroops.ts` BigInt-safe amounts, `explorer.ts` links — so the wording matches the payment history screens; admin/console-only fields (facilityId, patientProfileId, escrowId, sorobanContractId) are never rendered. **Built against assumed contracts** (order detail + order→intent lookup) pending docforum-core#85 — see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Patient order detail & payment panel".
- [x] Pay with wallet: prepare → sign → submit, including the expired-transaction case. Tracked as [issue #59](https://github.com/DocForum/docforum-web/issues/59) (High, 200 pts): `src/features/payments/` (`wallet.ts`, `wallet-pay.ts`, `hooks/usePayWithWallet.ts`, `components/PayWithWallet.tsx` + `OrderWalletPayPanel.tsx` on the order card — named apart from #61's `OrderPaymentPanel`, and reusing #61's order→intent lookup so both panels share one assumed contract). Stepper UI with preparing / waiting-for-your-wallet / submitting / confirming / confirmed states; an expired prepared transaction is a normal branch that re-prepares in one tap without leaving the panel, and a wallet refusal returns to the start with no error styling. The browser only relays XDR: docforum-core prepares it, the patient's wallet signs it, docforum-core submits it (hard rule 1 — no SDK imports, no network URLs, boundary check green). Feature-flagged **off by default** (`VITE_PAY_WITH_WALLET`, ADR 0005 "an option, not the default"). **Built against assumed shapes:** docforum-core#80 (prepare) and #81 (submit) haven't landed; the wallet bridge detects an injected extension instead of a wallet kit (issue #58 is parked on core#77/#78). See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W5".
- [ ] Link transaction hashes/escrows to the Stellar testnet explorer. Tracked as [issue #10](https://github.com/DocForum/docforum-web/issues/10) (Trivial, 100 pts). The helper this needs now exists — `src/features/payments/explorer.ts`, used by the patient receipt built for [issue #37](https://github.com/DocForum/docforum-web/issues/37) under Phase W2 and by the order payment panel (#61) — but the admin console does not link out yet, so this stays open.

## Phase W6 — Admin console
Admin-only screens beyond payments. Everything goes through `docforum-core`'s admin API; admin accounts stay seeded/invited (PRD OQ-2).
- [x] Audit and access log viewer. Tracked as [issue #71](https://github.com/DocForum/docforum-web/issues/71) (High, 200 pts) — `src/features/admin-audit/`, `AdminAuditPage` at `/admin/audit`. Two tabs: state-change events against `docforum-core`'s real `GET /admin/audit-events` (docforum-core#43), and PHI access logs against an assumed `GET /admin/access-logs` (docforum-core#45, still open — the tab says so on a `404`). Entity type/id, actor, action and date-range filters plus the page cursor all live in the URL; one 50-row page per request; entity links where an admin view exists (payment intents → `/admin?intent=`); client-side CSV export of the page on screen. The action filter is client-side within the loaded page, because the backend rejects an `action` parameter — a `docforum-core` API gap, see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] Stuck referrals console: reassign or cancel with a reason. Tracked as [issue #72](https://github.com/DocForum/docforum-web/issues/72) (High, 200 pts): `src/features/admin-referrals/`, `AdminReferralsPage` at `/admin/referrals`. Pending referrals past a 1/2/3/7-day threshold are listed oldest first with age, target specialty and stuck reason (no doctor, doctor inactive, loop flagged); loop-flagged referrals show their chain with the returning hop marked. Reassign offers only verified doctors in the target specialty (re-checked client-side, excluding the current and referring doctor) with 7-day availability; cancel tells the admin docforum-core notifies the patient. Both require a reason and send `expectedUpdatedAt`, so concurrent actions come back as conflicts and the queue refreshes. **Built against assumed shapes:** docforum-core#68 (admin referral operations) and #65 (loop chain) haven't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] System health page: readiness, background jobs and recent failures. Tracked as [issue #73](https://github.com/DocForum/docforum-web/issues/73) (High, 200 pts): `src/features/admin-system/`, `AdminSystemPage` at `/admin/system`. Overview tiles answer "is it broken?" at a glance (API readiness, background jobs, outbox dead letters), backed by a readiness-check list (required vs optional, so a Stellar RPC outage shows as degraded, not down), one card per job with last success, last failure, next run and an overdue flag for stalled jobs, and a recent-failures list with error messages. "Run now" asks for confirmation (Cancel focused) and shows docforum-core's result in the dialog: finished with item count, failed with the error, still running, already running elsewhere (`409`), or unconfirmed after a network failure. Everything refreshes every 30 s while the tab is visible and catches up when it's shown again; each source fails on its own, a failed poll never leaves a stale "Ready" on screen, and slow readiness answers are flagged as likely cold starts. **Built against assumed shapes:** docforum-core#104 (readiness), #100 (job runner) and #94 (outbox) haven't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] Feature flags console. Tracked as [issue #74](https://github.com/DocForum/docforum-web/issues/74) (High, 200 pts): `src/features/admin-flags/`, `AdminFlagsPage` at `/admin/flags`. Lists every flag with its state (on, rolling out, off), type, rollout percentage, role targeting and allowlist size, a plain-language "who it reaches" line, and who changed it last and when, taken from the audit trail. Search (key and description), state and type filters live in the URL. The switch and the edit dialog both go through a review step that shows each changed field before and after, the audience before and after, and the last change; turning a flag off is called out. Percentages must be whole numbers from 0 to 100, and allowlist entries must be user ids. Saves are optimistic. A failed save rolls back only that flag, never another save in flight, and the list refetches. `expectedUpdatedAt` turns concurrent edits into conflicts, and the dialog notices when the flag changes under it. **Built against assumed shapes:** docforum-core#132 hasn't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] Closure calendar management. Tracked as new issue (High, 200 pts): `src/features/admin-closures/`, admin closures page at `/admin/closures`. Admins can create and edit closures with a preview of affected booked appointments before saving. After saving, an affected-appointments report shows links to contact patients inside the closure period. All-day closures respect the correct time zone. Deleting a closure explains that removed slots are not recreated.
- [x] Fulfilment disputes queue for admins. Tracked as [issue #76](https://github.com/DocForum/docforum-web/issues/76) (High, 200 pts): `src/features/admin-disputes/`, `AdminDisputesPage` at `/admin/disputes` and `AdminDisputeDetailPage` at `/admin/disputes/:id`. Open disputes are listed oldest first with order, facility, patient, age and the escrow amount blocked, across cursor pages. The detail shows the patient's report, the facility's proof and reference, a display-only timeline, and the held payment. Attachments are opened only through a signed URL minted per click (never cached or stored); a missing proof is called out before the admin can rule for the facility. Resolving asks for notes (10–500 chars) and an explicit final-confirmation checkbox, shows the exact payment consequence first (release/refund the held amount, or "no money moves" if escrow already settled), sends `expectedUpdatedAt`, and handles `409`/`404` conflicts by closing and reloading, `422` by staying open with the server's message, and network failures as unconfirmed so a final action is never blindly retried. Admin nav and dashboard link to it. **Built against assumed shapes:** docforum-core#76 hasn't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] Per-specialty verification review: specialty claims queue. Tracked as [issue #65](https://github.com/DocForum/docforum-web/issues/65) (High, 200 pts): `src/features/admin-verification/`, `AdminVerificationPage` at `/admin/verification` (admin-guarded — distinct from the doctor verification queue above, which decides a doctor account; this one decides each claimed doctor↔specialty pair, PRD §8.1.5). Pending doctor↔specialty claims are grouped by doctor, each shown with its supporting credential (file name, type, size, upload date, viewed via blob URL so no bearer token lands in a link href) or flagged loudly when no document was attached. Approve/reject per claim in one dialog — a rejection **requires** a 10–500 character reason written for the doctor ("what to fix or resubmit"), an approval takes an optional audit note; no bulk actions, per the issue. Specialty and claim-age filters are server-side and synced to the URL. `expectedUpdatedAt` turns concurrent reviews into conflicts (`409`/`404` close and refresh, `400`/`422` keep the dialog open), retries after network failure are safe, and decisions link to the claim's audit trail. Admin nav ("Specialty claims") and the dashboard link to it; dev-mock fixtures/handlers cover the queue, filters, decisions and credential bytes. **Built against assumed shapes:** docforum-core#51 hasn't landed (plus docforum-core#23's specialty catalog for the dropdown). See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- [x] Doctor verification review queue. Tracked as [issue #64](https://github.com/DocForum/docforum-web/issues/64) (High, 200 pts): `src/features/admin-verification/`, `AdminVerificationsPage` at `/admin/verifications` and `AdminVerificationDetailPage` at `/admin/verifications/:doctorProfileId` (both admin-guarded). Pending doctors are listed oldest first with submitted date, age badge (3-day/week escalation) and document count; the detail shows the profile, credential documents opened only through a per-click short-lived signed URL, and the decision history projected from docforum-core's **real** audit trail (`doctor.verification_status_changed` events, core#43). Approve/reject both require a 10–500 character reason, send `expectedUpdatedAt`, and handle `409`/`404` (another admin decided) by closing and reloading the record, `400`/`422` by staying open with the server's message; a decided doctor drops out of the pending queue on refresh. The decision goes through the **real** `PATCH /doctors/:id/verification`. Admin nav and dashboard link to it; dev-mock fixtures/handlers cover the queue, detail, documents and decisions. **Built against assumed shapes:** the queue/detail/signed-url endpoints (credential storage is core#52) — see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
## Phase W7 — Platform quality: reliability, accessibility, performance, testing
- [x] Search across a user's loaded appointments, orders, results and message threads (issue #126): `src/features/search-records/` builds an in-memory index from only the active acting-for profile's care-thread cache or the signed-in doctor's appointment/message caches. The header search groups keyboard-navigable results and links to the corresponding record views; logout clears React Query data and profile changes discard the active query/index. `createRecordIndex` is the replacement seam for a future authenticated backend search service; no new API contract is assumed.
- [x] **PR malware scan** — `.github/workflows/pr-malware-scan.yml` + `.github/scripts/pr-malware-scan.cjs`, on every PR push. Flags editor/devcontainer autorun tasks, npm install hooks, typosquatted packages and Actions, non-registry dependency sources, payloads disguised as fonts/images, base64/whitespace obfuscation, exfiltration endpoints, reverse shells and miners. HIGH findings fail the `Malware scan` check, label the PR `security-review` and @mention the author; one comment per PR, updated in place. Reads the PR as data only (never checks out or runs it). Added 2026-10-20 after a VS Code autorun payload (escrow #163) and a typosquatted action (escrow #176). Manual backfill (Actions → PR malware scan → Run workflow, `prs: all`) scans PRs opened before the scanner and records a `Malware scan` commit status, which satisfies the required check.
- [x] Automated accessibility checks in CI (axe + Playwright). Tracked as [issue #91](https://github.com/DocForum/docforum-web/issues/91). Every concrete route is scanned in light and reduced-motion modes. Shared heading, labeling and contrast defects found by the first scan were fixed, leaving an empty exact-match, issue-linked allowlist. CI uploads the HTML report.
- [x] Visual regression testing with Playwright screenshots. Tracked as [issue #92](https://github.com/DocForum/docforum-web/issues/92). Eight key screens have committed desktop/mobile baselines, deterministic fake data and local fonts; CI runs in a pinned Playwright Noble container and uploads diffs. `e2e/README.md` documents updates.
- [ ] Patient journeys with mocked API. Tracked as [issue #93](https://github.com/DocForum/docforum-web/issues/93). Care history, facility discovery, a one-time network failure with retry, forced errors and cold-start latency are covered. Search, booking, intake and appointment list screens have not been built yet, so their journey and booking 409 cannot be exercised by browser tests.
- [ ] Doctor, facility and admin journeys with mocked API. Tracked as [issue #94](https://github.com/DocForum/docforum-web/issues/94). Queue start, consultation sign-off, fulfillment attribution, role guards and exact payment mutation counts are covered. Doctor order issuance UI has not been built yet.
- [x] Mock API for local development (MSW). Tracked as [issue #95](https://github.com/DocForum/docforum-web/issues/95) (High, 200 pts) — `npm run dev:mock` serves every endpoint the app uses through the normal service layer via `src/mocks/`: seeded obviously-fake fixtures, a dev-panel role switcher (patient/doctor/facility/admin), scenario toggles (empty states, forced errors), a latency slider, and a fixture reset. 26 handler tests drive the real `src/services/` layer against MSW; CI fails if mock code ever enters a production bundle (`npm run check:dist`). Documented in `CONTRIBUTING.md`.
- [ ] Generate MSW handlers and fixtures from the backend OpenAPI spec. Tracked as [issue #96](https://github.com/DocForum/docforum-web/issues/96) (High, 200 pts) — **blocked**: depends on [docforum-core#112](https://github.com/DocForum/docforum-core/issues/112) (OpenAPI 3.1 spec generated from the Zod schemas), which is still open — there is no authoritative `openapi.json` to generate from yet. Do not fabricate one; see that issue.
- [ ] Storybook component library with interaction and accessibility tests. Tracked as [issue #97](https://github.com/DocForum/docforum-web/issues/97) (High, 200 pts).
- [ ] Performance budget: route-level code splitting, lazy GSAP, and Lighthouse CI. Tracked as [issue #99](https://github.com/DocForum/docforum-web/issues/99) (High, 200 pts).
- [x] React Query key factory and cache invalidation conventions. Tracked as [issue #122](https://github.com/DocForum/docforum-web/issues/122) (High, 200 pts) — `src/query-keys.ts` (typed factory per resource, profile-scoped keys where the API scopes by profile, one invalidation root each) and `src/invalidations.ts` (the mutation → keys map, refreshed through `invalidateFor`); every query and mutation hook migrated off hand-written key arrays. Payment actions now refresh the affected intent and the facility ledgers, a confirmed visit action refreshes the dashboard appointment list and queue (the stand-in for booking until #2/#3 land and consume `appointmentKeys.list(profileId)`), and health writes stay scoped to the acting profile's one section. New tests: `query-keys.test.ts`, `invalidations.test.ts`, plus a hook-level invalidation case in `useQueue.test.tsx`. Conventions documented in `ARCHITECTURE_ESSENTIALS.md` "Query keys & cache invalidation".
- [x] API client: request cancellation, de-duplication, timeouts and retry policy. Tracked as [issue #123](https://github.com/DocForum/docforum-web/issues/123) (High, 200 pts) — `src/services/api-client.ts` now owns the whole HTTP lifecycle: every request has a timeout (`DEFAULT_TIMEOUT_MS` 60 s, deliberately longer than a cold start so the `useSlowRequestHint` explanation isn't turned into a fake failure; slow endpoints — data-export create/download, admin job run — pass `SLOW_REQUEST_TIMEOUT_MS` 120 s) failing with a typed `ApiTimeoutError` that is distinct from `ApiError` and from an abort; identical concurrent GETs share one network request and one parsed result (keyed by URL, bearer token and timeout), with **independent cancellation per caller** — one caller walking away never fails the others, and the shared request is aborted only when its last caller does; mutations are never de-duplicated. Every service function used by a query takes an optional `AbortSignal` and every `queryFn` passes React Query's signal through, so navigating away actually stops the request; catch-all fallbacks rethrow aborts/timeouts instead of caching placeholder data (`useCareThreads`, `useFacilityLedger`). The shared `QueryClient`'s retry policy retries transient failures once and never retries a cancellation (`isAbortError`).
- [x] Shared form system: react-hook-form with schema validation. Tracked as [issue #102](https://github.com/DocForum/docforum-web/issues/102) (High, 200 pts) — `react-hook-form` + `zod` schema validation layer (`src/components/form/FormField.tsx`, `src/hooks/useZodForm.ts`, `src/utils/form.ts`) with consistent, accessible errors (`aria-describedby`/`aria-invalid`), focus-to-first-error on submit, and server-side validation-error mapping onto fields. Migrated login, signup, wallet link and create payment intent forms. Documented in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Shared form system".
- [x] DataTable component with cursor pagination, sorting and URL-synced filters. Tracked as [issue #116](https://github.com/DocForum/docforum-web/issues/116) (High, 200 pts) — `src/components/DataTable.tsx` + `useTableUrlState`. Generic `<DataTable<T>>` with typed column definitions, text/select filter inputs, server-side sort via `aria-sort`, cursor pagination (Newer/Older — no page-number jump). Filters, sort and cursor sync to the URL. Responsive card layout under 600px via CSS. CSF 3 stories. 15 component + 7 hook tests.
- [x] Print and PDF framework for orders, receipts and records. Tracked as [issue #117](https://github.com/DocForum/docforum-web/issues/117) (High, 200 pts) — `src/components/PrintLayout.tsx` (inline logo, title, generated date, no nav chrome). `usePrint` hook (window.print + lazy `jspdf`/`html2canvas` PDF export, never in main bundle). Applied to `PaymentReceiptDocument`, `OrderDetailDocument`, `DataExportSummaryDocument`. `@media print` page-break rules.
- [x] Privacy-preserving product analytics (no PHI, no third-party tracking). Tracked as [issue #118](https://github.com/DocForum/docforum-web/issues/118) (High, 200 pts) — `src/utils/analytics.ts`: cookieless, self-hostable, disabled unless `VITE_ANALYTICS_ENDPOINT` is set. Explicit `ALLOWED_EVENTS` allowlist with no PHI. `scrubUrl` strips query strings and ids. DNT/GPC respected. `useAnalyticsPageview` hook. `/privacy` page. Env vars in `.env.example`.
- [x] ADR + migration: configurable router (BrowserRouter / HashRouter). Tracked as [issue #119](https://github.com/DocForum/docforum-web/issues/119) (High, 200 pts) — `docs/adr/0001-routing-strategy.md` compares hosting options. `main.tsx` selects `BrowserRouter` by default, `HashRouter` when `VITE_USE_HASH_ROUTER=true`. `deploy-pages.yml` sets that flag for GitHub Pages. `HashRedirectShim` converts old `#/path` links to clean paths transparently.
- [x] Preview builds for every pull request. Tracked as [issue #104](https://github.com/DocForum/docforum-web/issues/104) (High, 200 pts) — `pr-preview-build.yml` builds each PR in mock-API mode on `pull_request` (read-only, no secrets) and uploads a downloadable artifact; `pr-preview-comment.yml` comments the artifact link from `workflow_run` (resolving fork PRs from the head SHA/branch) and never publishes to Pages. Artifacts are private, expire after 14 days, and are built against a reserved-invalid API URL checked by `npm run check:preview`. `deploy-pages.yml` is unchanged. Documented in `CONTRIBUTING.md`.
- [x] Test utilities and coverage gating. Tracked as [issue #105](https://github.com/DocForum/docforum-web/issues/105) (High, 200 pts) — `renderWithProviders` (fresh QueryClient, router, role/session), typed factories, one shared MSW server, and a v8 coverage gate on `src/features/` + `src/services/` run by CI (`npm run test:coverage`). Two existing tests refactored onto the utilities.
- [x] Consistent loading, empty and error states across the app. Tracked as [issue #106](https://github.com/DocForum/docforum-web/issues/106) (High, 200 pts) — `Skeleton` (reduced-motion aware), `EmptyState` (next action required), `InlineError`, `PageError` and the `QueryState` helper in `src/components/states/`, applied across the route-level and query-driven views; stories written in CSF for #97.
- [x] Notification centre: in-app inbox, unread badge and live updates. Tracked as [issue #107](https://github.com/DocForum/docforum-web/issues/107) (High, 200 pts) — header bell with server-backed unread count, dropdown + `/notifications` cursor-paginated inbox, mark-one/mark-all read, kind → role-aware deep link mapping with generic rendering for unknown kinds, SSE via a single-use stream ticket (never the access token) plus a cross-tab BroadcastChannel, and mock fixtures/handlers. Built against the assumed contract recorded in `ARCHITECTURE_ESSENTIALS.md`.
- [x] **PR conflict notifier** — `.github/workflows/pr-conflict-notifier.yml` + `.github/scripts/pr-conflict-notifier.cjs`. On every push to `main` (and every 3h) it labels open PRs that conflict with `main` as `needs-rebase` and @mentions the author once per push with rebase steps; the label clears itself when the conflict is resolved. Runs from `main` only and never checks out PR code.
- [x] Notification preferences and quiet hours. Tracked as [issue #108](https://github.com/DocForum/docforum-web/issues/108) (High, 200 pts) — `src/features/notifications/`, `NotificationSettingsPage` at `/settings/notifications`. One toggle per notification type × channel (email/SMS/in-app), role-appropriate defaults, safety-critical lab/security rows locked on in both UI and mock API, and quiet hours with an explicit IANA zone. Optimistic saves roll back to the previous snapshot on failure; invalid same-start/end windows are refused before sending. **Built against an assumed shape:** docforum-core#99 hasn't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W7".
- [x] Shared SSE client for real-time updates. Tracked as [issue #109](https://github.com/DocForum/docforum-web/issues/109) (High, 200 pts) — `src/services/event-stream-service.ts`, `src/hooks/useServerEvents.ts`, `src/hooks/useRealtimeCacheSync.ts`. One fetch-based connection per tab (Authorization header + `Last-Event-ID`, which `EventSource` can't send), typed subscriptions, incremental parser, bounded exponential backoff, one auth-refresh retry on `401`/`auth.expired`, pause after 60 s hidden and reconnect on return, and React Query invalidation for notification/queue/message/admin events. The replay cursor is cleared when the account changes. **Built against an assumed shape:** docforum-core#97 hasn't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W7".
- [x] App-wide time-zone-correct date/time display. Tracked as [issue #110](https://github.com/DocForum/docforum-web/issues/110) (High, 200 pts) — `src/i18n/time-zone.ts`, `TimeZoneProvider`, `ZonedTime`/`DualZoneTime`, and a settings picker under Account settings. All date/time renderers now take an explicit IANA zone; storage is `localStorage['docforum-time-zone']`, with the browser zone as fallback. Tests cover DST gaps/overlaps and cross-midnight zone differences. `CareTimeline` shows the doctor's zone alongside the viewer's when they differ (from step metadata); the booking/appointment screens named in the issue don't exist in this repo yet, so dual-zone display could not be wired into them. No API dependency; see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W7".
- [x] Typed feature-flag client. Tracked as [issue #111](https://github.com/DocForum/docforum-web/issues/111) (High, 200 pts) — `src/services/my-flags-service.ts`, `src/features/feature-flags/`, `useFlag`/`useFlagsStatus`, `Flag` and `RequireFlag`. Flags are evaluated server-side and read from `/me/flags`; unknown/missing/failed flags are safely off, loading gates render no protected UI until the answer arrives, the notification route and nav item are gated by `notification_preferences`, and realtime SSE is gated by `realtime_updates`. The mock dev panel can override flags. **Built against an assumed shape:** docforum-core#132 hasn't landed. See `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W7".

## Phase W7 — Platform quality: reliability, accessibility, performance, testing
- [x] [Issue #83](https://github.com/DocForum/docforum-web/issues/83): adopt the generated `@docforum/api-client`, re-export generated model types, route every service through the typed client, preserve BigInt amounts as strings, and add a warn-only spec-version check in CI.
- [x] [Issue #84](https://github.com/DocForum/docforum-web/issues/84): map machine-readable error codes to localized recovery copy, keep raw server messages out of the UI, and contain render failures with app, route, and feature-section error boundaries.
- [x] [Issue #86](https://github.com/DocForum/docforum-web/issues/86): add an installable HashRouter-compatible PWA with static app-shell precaching, no API runtime cache, logout cache hygiene, and an explicit update prompt.
- [x] [Issue #87](https://github.com/DocForum/docforum-web/issues/87): add lazy ICU locale bundles, a language preference switcher, extracted message catalogues, and a CI check for missing, unused, and invalid ICU messages.

## Changelog

> New entries go in `changelog.d/`, one file per PR — see
> `changelog.d/README.md`. Maintainers fold them in here with
> `node scripts/fold-changelog.mjs`. Please don't append to this section
> directly.

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
- 2026-09-26 — Opened [issue #9](https://github.com/DocForum/docforum-web/issues/9)
  for the one remaining W1 gap (no refresh-on-reload), and fixed the
  stale `auth-store.ts` comment that said `docforum-core` hadn't picked
  a refresh-token transport (it's an httpOnly cookie). Linked issue #1
  to its new backend counterpart, `docforum-core` issue #23.
- 2026-10-07 — Opened issues #10 (explorer links in the payments
  console), #11 (ESLint in CI) and #12 (end-to-end smoke test against a
  real `docforum-core`, the unchecked Phase W1 item).
- 2026-10-15 — Implemented Phase W2 issue #25 (order detail with verifiable
  QR code and print-friendly view): added `OrderType`/`OrderStatus`/`Order`/
  `OrderItem` types to `src/types/models.ts` (assumed — see
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions"), `orders-service.ts`,
  `src/features/orders/` (hook + `OrderDetail` + `OrderQrCode` components +
  CSS modules with `@media print` rules), and `src/pages/OrderDetailPage.tsx`
  routed at `/patient/orders/:orderId`. QR code encoded client-side via
  `qrcode@1.5.4` from the token string only (no order details in QR).
  Superseded/expired/cancelled orders show an explanation instead of a QR;
  active orders show a large scannable QR with a full-screen mode and a
  print/PDF button. Global `.no-print` utility class added to `global.css`.
  14 new component tests added; all 41 tests pass, typecheck and build green.
- 2026-10-16 — Built Phase W2 patient features: dependents management
  (#19), acting-for profile switcher (#20), health profile editor (#18),
  and guardian consent/age-of-majority handover screens (#21). All four
  built against documented assumed API shapes (recorded in
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions"). New types in
  `models.ts` (`Dependent`, `HealthEntry`, `ActingProfile`), services
  (`dependents-service.ts`, `health-profile-service.ts`), Zustand
  profile store (`profile-store.ts`), feature folders
  (`src/features/dependents/`, `src/features/health-profile/`), pages
  (`DependentsPage`, `HealthProfilePage`, `ClaimAccountPage`), and routes
  (`/patient/dependents`, `/patient/health`, `/claim-account`). Profile
  switcher in header, acting-for banner on patient pages. Tests for every
  new component.
- 2026-10-16 — Built Phase W2 patient core flows: download my data (#26),
  account deletion with clinical retention explanation (#27), care thread
  timeline (#28), and facility finder with map and distance-sorted results
  (#29). Built against documented assumed API shapes in
  `ARCHITECTURE_ESSENTIALS.md`. New types in `models.ts` (`DataExport`,
  `DeleteAccountResponse`, `CareThread`, `CareThreadStep`, `FacilityWithDistance`),
  services (`account-service.ts`, `care-thread-service.ts`, `facility-service.ts`),
  features (`src/features/account/`, `src/features/care-thread/`, `src/features/orders/`),
  components (`DataExportSection`, `DeleteAccountSection`, `CareTimeline`,
  `FacilityFinder`, `FacilityMap`, `FacilityCard`), pages (`AccountSettingsPage`,
  `AccountDeletedPage`, `CareThreadPage`, `FacilityFinderPage`), and routes
  (`/patient/settings`, `/account-deleted`, `/care`, `/care/:threadId`,
  `/patient/facilities`). Strict privacy enforcement: transient in-memory
  location only (never persisted to storage or URLs). 15 test files and
  62/62 tests passing.
- 2026-10-16 — Rebuilt `PatientDashboardPage` from a placeholder into the
  patient care hub ([issue #33](https://github.com/DocForum/docforum-web/issues/33)): `src/features/care-hub/` holds a pure
  ranking module (`ranking.ts`) plus `useCareHub`, which fans out to the
  existing dependents and health-profile queries in parallel and turns
  their results into cards ranked `blocked now → needs you → good to know`,
  with a 30-day "Recent" window. One failing source degrades its own
  section instead of blanking the page, and a health section that *errored*
  is never reported to the patient as an empty profile. Sections for
  unbuilt features are hidden, not stubbed — "Coming up" only appears once
  a card source for it lands, which [issue #32](https://github.com/DocForum/docforum-web/issues/32)
  supplies from `docforum-core`'s real `GET /appointments/mine`. Adds
  `src/features/care-hub/ranking.test.ts` and
  `src/pages/PatientDashboardPage.test.tsx`; 57 tests pass (was 44 on
  `main`), typecheck and build green.
- 2026-10-16 — Checked the three other assigned W2 issues against the
  current code and backend: #32 (check-in + live queue position), #34
  ("who viewed my records" access log) and #37 (payment history and
  receipts) each need a `docforum-core` endpoint that does not exist yet —
  no check-in/queue route, no access-log route, and
  `src/services/payments-service.ts` can create/read/fund a single
  `PaymentIntent` by id but has no list-the-patient's-payments route.
  Concluded they "stay unimplemented rather than built on a fabricated
  contract", which was the wrong call and is corrected by the entries
  below: hard rule 1 forbids calling Stellar/escrow directly, not building
  a patient screen against a *documented* assumed shape — and #18, #19 and
  #21 all did exactly that, recorded in "Known assumptions". What the check
  did establish and what still gates these screens is the missing backend
  work (`docforum-core` #129, #45 and #90).
- 2026-10-16 — Built #32: check-in and live queue position on appointment
  day. `src/services/appointments-service.ts` calls `docforum-core`'s real
  `GET /appointments/mine` (a bare array, newest-first, `availabilitySlot`
  included) and the assumed queue/check-in routes. `src/features/appointments/`
  holds the pure parts (`slot.ts` — local-calendar-day maths, so "today"
  means the patient's day not UTC's; `queue.ts` — notification threshold and
  a signature so a patient is told about a *change*, not every poll), the
  `useAppointmentQueue` hook (polls only while the visit is on screen and
  `status === 'scheduled'`, `gcTime: 0` so leaving the page stops the
  requests) and `QueuePanel`. `AppointmentDetailPage` at
  `/patient/appointments/:appointmentId` is reachable from the care hub's
  "Coming up"/"Action needed" cards; check-in UI only appears on the day of
  the visit. Estimates are always labelled as estimates, `peopleAhead: null`
  renders as "not published" rather than "zero people ahead", and a 404 from
  the unlanded queue route reads "check-in is not available for this visit
  yet" instead of an empty queue. `src/hooks/useBrowserNotification.ts` asks
  for permission only on a click and never re-asks after a refusal.
- 2026-10-16 — Built #34: 'who viewed my records' access log at
  `/account/access-log`. `src/services/access-log-service.ts` reads the
  assumed `GET /patients/me/access-log` (cursor-paginated, `from`/`to`/
  `recordType` filters) through `useInfiniteQuery`, so "show older entries"
  asks for the next cursor only when the patient asks for it.
  `src/features/account/` renders who (name + role), what and why, and
  never an internal id; the "why" copy explains the treating-clinician and
  fulfilling-facility cases rather than dumping a reason code. The
  report-a-concern link is only rendered when `VITE_SUPPORT_EMAIL` is set —
  an invented mailto would send a patient's privacy complaint nowhere.
- 2026-10-16 — Built #37: payment history and printable receipts at
  `/payments` and `/payments/:intentId`. `src/features/payments/stroops.ts`
  converts `amountStroops` with BigInt only, so an amount above 2^53 prints
  exactly (`900,719,925.4740993 XLM`) instead of silently rounding the
  patient's own money; `explorer.ts` is the single source of testnet
  explorer links (all calls still go through `docforum-core` — hard rule 1
  — this only turns a hash core already returned into a URL); `status.ts`
  labels and explains every `PaymentIntentStatus` in the patient's terms.
  `PaymentReceipt` keeps the transaction hash and escrow contract id as
  readable text so a printed copy is still verifiable, hides the page
  chrome at print time, and omits `orderId`, which a patient cannot act on.
  The assumed `refundDeadlineAt` renders nothing when absent rather than a
  guessed window.
- 2026-10-16 — #32/#34/#37 together: 156 tests pass across 25 files (57 on
  this branch before, 44 on `main`), `npm run typecheck` clean, `npm run
  build` clean. Types for every assumed shape are annotated as assumed in
  `src/types/models.ts` and recorded in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-17 — Built Phase W3 doctor core flow (#45–#49): live queue with
  start/complete visits, running delay + manual override and 4s undo window
  (#49); doctor messages inbox with unread badge, truncated PHI previews,
  oldest-unanswered-first sorting, filters and pagination (#47); command
  palette + configurable keyboard shortcuts with input suppression and help
  dialog (#46); consultation note sign-off with append-only addenda (#45).
  New types/services/features for queue, messaging and consultation; wired
  into `DoctorDashboardPage`, `Layout` (unread badge) and routes
  (`/doctor/consultation/:id`, `/doctor/messages`). Updated
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" with the Phase W3
  assumed API shapes. Typecheck, build, and all non-pre-existing tests pass.
- 2026-10-18 — Built Phase W3 Doctor practice insights (#50) and Phase W4 Facility staff accounts with fulfillment attribution (#51):
  - `#50 Doctor practice insights`: private insights page (`/doctor/insights`) with weekly slot utilisation, no-show and late-cancellation rates, referral acceptance turnaround, and messages response time. Includes SVG charts paired with accessible semantic `<table>` alternatives, date range selector (presets + custom), clearly labelled small-sample caveats, and strict peer-comparison suppression (doctor's own confidential data only). Wired into `DoctorDashboardPage`, command palette (`⌘K`), and navigation.
  - `#51 Facility staff accounts & fulfillment attribution`: dedicated team management page (`/facility/team`) with member list, role assignment (`owner` vs `staff`), email invitations, resend/revoke pending invites, member removal with backend session revocation warning, and last-owner deletion protection. Enforced read-only view and action suppression for staff members. In the fulfillment queue (`/facility`), added action attribution display showing which staff member dispensed/fulfilled each order for PRD §7 audit trail.
  - Updated `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" and `ROADMAP.md`. 24 test files and 112/112 tests passing; typecheck and build green.
- 2026-10-18 — Built Phase W6 (new section) audit and access log viewer (#71): `/admin/audit` with state-change and record-access tabs, URL-synced filters (entity type/id, actor, action, date range) and keyset cursor pagination (newer-page trail kept in history state so browser back/forward agrees with the pager), entity record links, entity-history/actor pivots, and formula-safe client-side CSV export of the current page. Audit events use `docforum-core`'s real contract (#43); access logs are an assumed shape pending docforum-core#45. Admin nav gained Payments/Audit trail links; `/admin?intent=<id>` now opens a payment intent directly. Viewer never logs to the console (tested). 27 test files and 153/153 tests passing; typecheck and build green.
- 2026-10-18 — Built Phase W6 stuck referrals console (#72): `/admin/referrals` queue of referrals pending past an age threshold (URL-synced threshold and reason filter, oldest first, cursor "Load more"), loop-chain context for loop-flagged referrals, reassign dialog with a doctor picker limited to verified doctors in the target specialty (with availability, chain-member warning, ineligible rows hidden and counted), and cancel dialog with patient-notification notice. Both actions need a 10–500 character reason, send `expectedUpdatedAt` for conflict detection, handle 409/404 (someone else acted) by closing and refreshing, and link to the referral's audit trail afterwards. Admin nav and dashboard link to it. API shapes are assumed pending docforum-core#68/#65. 30 test files and 207/207 tests passing; typecheck and build green.
- 2026-10-18 — Built Phase W6 system health page (#73): `/admin/system` with readiness, background-job and outbox overview tiles, per-check readiness list (required/optional, duration, detail, cold-start hint), job cards (healthy, last run failed, overdue, running, never run; last success, last failure, next run), recent failures from the last 24 hours, and a confirmed "Run now" that shows the run's result in place (finished, failed, still running, `409` already running, unconfirmed). Polls every 30 s only while the tab is visible. 404s show as "not served yet"/"not exposed" rather than errors. Admin nav and dashboard link to it. API shapes are assumed pending docforum-core#104/#100/#94. 33 test files and 267/267 tests passing; typecheck and build green.
- 2026-10-18 — Built Phase W6 feature flags console (#74): `/admin/flags` lists flags with state, type, rollout bar, targeting, a "who it reaches" summary and last change (actor and time from `GET /admin/audit-events?entityType=FeatureFlag`, one request for all flags). Search, state and type filters are synced to the URL. The edit and quick-toggle dialogs share a review-then-confirm step (field diff, audience before and after, last change). Validation covers a whole-number 0–100 percentage and a UUID allowlist (max 500). Optimistic saves roll back per flag on failure, re-read the server's state afterwards, and handle 409/404 conflicts and mid-edit staleness. Admin nav and dashboard link to it. API shape assumed pending docforum-core#132. 37 test files and 335/335 tests passing; typecheck and build green.
- 2026-10-19 — Built Phase W2 symptom-based doctor search (#30): `/patient/search` (new route, patient-gated, linked from the header and patient dashboard) with a WAI-ARIA 1.2 combobox (`src/components/Combobox.tsx`) autocompleting against a controlled symptom vocabulary, mapped-specialty disclosure ("Showing doctors in Cardiology and General practice"), an availability filter combined with the symptom, and a no-match state with concrete guidance. Suggestion requests are debounced (250 ms) and superseded in-flight requests are cancelled via React Query's AbortSignal. All state (symptom slug + availability) lives in the URL with validation and drop-notices for hand-edited links. Because issue #1 (doctor search) was still open, this PR also adds the underlying doctor-search page/service (`src/services/search-service.ts`, assumed shapes for docforum-core#23 and #60), the reusable combobox, and MSW handlers/fixtures for `/symptoms`, `/symptoms/:slug` and `/doctors`. Mock bootstrap (`src/mocks/setup.tsx`/`main.tsx`) now awaits MSW readiness before the first render, so deep-linked states no longer race the worker's startup. New tests: Combobox keyboard/ARIA suite, SymptomCombobox debounce + cancellation suite, DoctorSearchView integration suite, URL-param and specialty-list units, and 3 new handler tests. 45 test files and 407/407 tests passing; typecheck, build and `check:dist` green. Desktop and mobile screenshots of all four states in `screenshots/doctor-search-*`. `ROADMAP.md` and `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" updated.
- 2026-10-18 — Built Phase W4 Scan-to-verify orders (#52) and Facility payout ledger with escrow terms (#53):
  - `#52 Scan-to-verify orders with device camera`: dedicated verification page (`/facility/verify`) enabling facility staff to scan order QR codes via device camera or enter tokens manually. Uses native `BarcodeDetector` API with fallback; guarantees complete media stream track teardown on screen unmount/exit. Dispatches to `POST /facilities/me/verify-order` and cleanly displays all 5 result states (`valid`, `superseded`, `expired`, `fulfilled`, `not_eligible`) alongside minimal clinical order summaries. Valid results feature an immediate CTA to jump into fulfillment (`/facility?orderId=...`). Surfaces HTTP 429 rate-limit protection against enumeration.
  - `#53 Facility payout ledger with escrow terms`: dedicated payments page (`/facility/payments`) displaying held, released, and refunded totals for both XLM and USDC. Uses BigInt-safe math (`formatStroops`) for Stellar 7-decimal stroop precision. Renders cursor-paginated escrow ledger with plain-language terms (releaser rules and refund deadline countdowns) adhering to threat model T8. Prominently flags approaching refund deadlines (< 48h) on unfulfilled orders. Integrates direct deep links to Stellar Expert testnet explorer for funding, release, and refund transactions.
  - Updated `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" and `ROADMAP.md`. 26 test files and 124/124 tests passing; typecheck and build green. Captured desktop and mobile screenshots into `screenshots/`.
- 2026-10-19 — Built invitation redemption for admins & facility staff
  (#81, PRD OQ-2): `InvitePage` at `/#/invite?token=` that validates the
  token, shows the inviting organisation, role and inviter, and drives
  both acceptance paths — new-user account creation (email locked to
  the invite; role comes from the invite and is never a form field or a
  request field) and existing-user accept (one click when already signed
  in, or through `/login` and straight back to the invite via router
  state). Clear expired / revoked / already-used / not-found states. The
  token is read from the URL once and immediately stripped, so the
  credential never lingers in the address bar or history; nothing is
  persisted to storage. New: `AccountInvite`/`InviteRole` types in
  `models.ts`, `getInvite`/`acceptInvite` in `auth-service.ts`,
  `src/features/invite/`, the `/invite` route, and MSW mock handlers
  with demo tokens (`admin-demo`, `expired-demo`, `revoked-demo`,
  `used-demo`, `missing`). Tests: 13 new — invite detail/state screens,
  a `?role=admin` URL-tampering test proving the role and payload stay
  server-derived, the login round trip, and the bearer token on
  existing-user accept — plus the signup test extended to assert
  facility AND admin are never offered at self-serve signup.
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions" updated with the
  assumed contract (pending docforum-core#39/#75). Screenshots captured
  into `screenshots/`.



- 2026-10-20 — Phase W7 React Query key factory and cache invalidation conventions (#122): `src/query-keys.ts` owns every cache key as a typed per-resource factory (roots, profile-scoped lists, sibling flag keys preserved) and `src/invalidations.ts` is the documented mutation → keys map with an `invalidateFor` helper; every query/mutation hook in the tree migrated off ad-hoc arrays — including the ones merged to `main` after this branch was cut (appointments, appointment queue/detail, patient chart, abnormal results, calendar feed, payment history, access log). Behavior added: payment fund/release/refund also invalidates the facility ledgers whose held/released totals moved, confirmed visit actions refresh the dashboard appointment list + queue, and every write invalidates the narrowest true key (profile- and section-scoped for health, per-sub-list for facility team). 61 test files and 532/532 tests passing; typecheck, build and check:dist green. No API shapes assumed; no screen changed, so no screenshots.
- 2026-10-20 — Hardened the API client (#123): every request now has a timeout — `DEFAULT_TIMEOUT_MS` (60 s, deliberately longer than docforum-core's ~1 minute cold start so the 4 s slow-request hint describes a wait that then succeeds) and `SLOW_REQUEST_TIMEOUT_MS` (120 s) for data-export create/download and admin job runs — failing with a typed `ApiTimeoutError` distinct from `ApiError` and from an abort. Identical concurrent GETs share one network request and one parsed result (keyed by URL, bearer token and timeout) with independent per-caller cancellation; mutations are never de-duplicated. Every query-serving service function takes an optional `AbortSignal` and every `queryFn` passes React Query's signal through, so navigating away stops the request; catch-all fallbacks rethrow aborts/timeouts so a cancelled query never caches placeholder data (`useCareThreads`, `useFacilityLedger`). The shared `QueryClient` retries transient failures once and never a cancellation (`isAbortError`). Documented in `ARCHITECTURE_ESSENTIALS.md` "API client behaviour". After merging `main`, the services that landed there (access log, appointment detail/list/check-in queue, calendar feed, patient chart, payment history, abnormal results, doctor today's intake, patient orders + qualified facilities, facility fulfillment queue) take and thread the same signal, and the multipart upload helper `apiFetchForm` rides the same timeout/abort plumbing (still never de-duplicated, still no `Content-Type` so the browser keeps the boundary). 68 test files and 584/584 tests passing (27 new on this branch: timeout, abort, de-dup, mutation-non-sharing, service signal wiring, slow-endpoint budget, multipart upload); typecheck, build and `check:dist` green.
- 2026-10-19 — Added Phase W3 doctor core flow components (`AbnormalResultsInbox`, `CalendarSubscriptionSection`, `PatientChartPanel` + `/doctor/patient-chart/:patientProfileId`) and resolved TypeScript typecheck/JSX errors across `App.tsx`, `ConsultationNote.tsx`, `PatientChartPanel.tsx`, `usePatientChart.ts`, `AbnormalResultsInbox.tsx`, and `useCalendar.ts`.
- 2026-10-20 — Shared form system: react-hook-form with schema validation (issue #102): `react-hook-form` + `zod` layer (`src/components/form/FormField.tsx`, `src/hooks/useZodForm.ts`, `src/utils/form.ts`) with accessible errors, focus-to-first-error, and server validation-error mapping onto fields. Migrated login, signup, wallet link and create payment intent forms; added LoginForm, CreatePaymentIntentForm tests and extended SignupForm/WalletLinkForm tests with server-error mapping. 42 test files and 380 tests passing; typecheck, build and check:dist green.
- 2026-10-20 — Added the PR conflict notifier workflow (see the CI item above): maintainers no longer need to manually ask authors to rebase after each merge.
- 2026-10-20 — Fixed the failing `CI / Frontend (typecheck + test + build)`
  check on the closure-calendar branch: the new
  `src/mocks/handlers/admin-closures.ts` was written in a made-up handler
  shape instead of this repo's MSW convention, so `setupWorker(...)` /
  `setupServer(...)` in `browser.ts` and `handlers.test.ts` failed
  typecheck (12 errors, CI step 1). Rewrote the five `/admin/closures`
  endpoints as `http.*` + `respond(...)` handlers, seeded `closures` into
  the mock `MockDb` (`src/mocks/fixtures.ts`) so create/update/delete
  persist across requests for the dev-server lifetime, and made the
  affected-appointments preview compute real overlap with `db.appointments`
  (scheduled/checked_in bookings only, 404 for an unknown closure) instead
  of returning a hard-coded list. Added 3 handler tests driving
  `admin-closures-service` through MSW per this repo's convention. Also
  restored `@sentry/react` as a **declared** `package.json` dependency:
  #171 imports it from `src/main.tsx` and `src/utils/phi-scrubber.ts` and
  put it in the lockfile, but never in `package.json`, so `npm ci` pruned
  it and typecheck failed on every branch after that merge. Also merged
  `main` (#185/#183/#186) into this branch to clear the PR's merge
  conflicts, which had stopped GitHub building the merge ref — so the
  `pull_request` CI run never started at all. Verified on the final
  merged tree: 70 test files and 597/597 tests, typecheck, build and
  `check:dist` all green.
- 2026-10-20 — Built Phase W6 fulfilment disputes queue (#76): `/admin/disputes` lists open disputes oldest first with age badges (24 h/72 h escalation), order, facility, patient and the escrow amount blocked, loading further cursor pages; `/admin/disputes/:id` shows the patient's report, facility proof and reference, a timeline, the held payment intent, and attachments opened only through signed URLs minted per click. Resolution is final: the dialog previews the exact payment consequence (release or refund the held amount, or "no money moves" if escrow was already settled), requires 10–500 character notes and an explicit final-confirmation checkbox, sends `expectedUpdatedAt`, closes and reloads on `409`/`404`, stays open on `422`, and refuses to offer a retry when a network failure leaves the outcome unknown. Admin nav and dashboard link to it; dev-mock fixtures/handlers cover proof, no-proof and multi-page states. 12 desktop/mobile screenshots in `screenshots/`. **Built against assumed shapes:** docforum-core#76 hasn't landed. 63 test files and 557/557 tests passing; typecheck, build, `check:dist` and the Stellar boundary check green.
- 2026-10-20 — Built #5 orders list + facility selection (`/patient/orders`): `src/features/orders/`, `orders-service.ts`, current-version resolution from supersedes chains, qualified-facility chooser with `expectedVersion` conflict handling, mock endpoints/fixtures, and tests. Assumed shape recorded in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-20 — Built #6 doctor today's appointments + intake: `src/features/doctor-today/`, `doctor-today-service.ts` (`GET /appointments/:id/intake`), expandable intake rows on the doctor dashboard, lazy per-appointment intake queries, mock fixtures/handler, and tests. Assumed `IntakeForm` shape recorded in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-20 — Built #7 consultation outcome + referral/order issuance: outcome panel in `src/features/consultation/`, `recordConsultation`/`createConsultationReferral`/`issueConsultationOrder` services, sequential submission with partial-success handling, conditional validation, mock records/referrals/orders and handler tests. Assumed contracts recorded in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-20 — Built #8 facility fulfillment queue + lab-result upload: `src/features/facility-queue/`, `fulfillment-service.ts`, `apiFetchForm` multipart transport, in-progress/fulfilled/rejected transitions with terminal protection, file validation and upload UI, mock action/upload handlers, and queue tests. Removed the dashboard's hardcoded `DEFAULT_MOCK_QUEUE` fallback. Documented the pending `FulfillmentRecord` ADR and object-storage caveats in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-20 — Built Phase W5 payment status panel on patient orders (#61, custodial mode): patient order detail page `/patient/orders/:orderId` (`OrderDetailPage`, linked from #5's orders list) plus `OrderPaymentPanel` on `src/features/payments/` — the intent's status shown to the patient in plain language with a timeline for every state (not funded → held in escrow → released or refunded; failed says contact support), the escrow's protection made visible on the order itself rather than only in the admin console. Panel hides entirely when an order has no payment intent (404 → `null` in `payments-service.getPaymentIntentForOrder`); any other payment-lookup failure degrades to a quiet note. Reuses issue #5's `PatientOrder` shape and the shared patient-payment helpers (`status.ts` copy, `stroops.ts` BigInt-safe amounts, `explorer.ts` links) so wording matches the payment history screens. MSW mocks gained the two assumed endpoints (`GET /orders/:orderId`, `GET /payments/intents?orderId=`); demo orders were extended so all five intent statuses and a no-intent (panel hidden) case are exercisable in `npm run dev:mock`. **Built against assumed contracts** pending docforum-core#85 — documented in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Patient order detail & payment panel".
- 2026-10-20 — Hardened the PR automation against transient GitHub API errors. Today a single 500/503 response aborted a whole conflict-notifier run, so no PR after it got labelled. Both `pr-conflict-notifier.yml` and `pr-malware-scan.yml` now set `retries: 3` on `actions/github-script`, so 5xx responses are retried. The notifier also isolates each PR: a PR whose API calls still fail is skipped with a warning, listed as "API error, retried next run" in the run summary, and the remaining PRs are processed normally.
- 2026-10-20 — Rebased message attachments (#23) onto the latest main: kept the doctor inbox's per-thread summary as `DoctorMessageThread` (freeing `MessageThread` for the consultation thread entity), added the shared thread route for doctors at `/doctor/messages/:threadId` alongside the existing patient route, and resolved the `ROADMAP.md`/`ARCHITECTURE_ESSENTIALS.md` conflicts. Upload progress/cancel/retry, inline image previews, PDF chips and per-click signed downloads remain as originally implemented; signed URLs are never cached. `npm run typecheck`, `npm test` and `npm run build` all pass on the rebased tree.
- 2026-10-19 — i18n (#87) + safe error rendering (#84) for the auth,
  account and dependents feature components. Migrated hard-coded English
  UI copy to `useT()`/`react-intl`; forms now render `useErrorMessage()`
  instead of raw `ApiError.message` values. Remaining literals without
  catalogue ids (data-export and account-deletion screens) are reported
  for a follow-up catalogue addition. `npx vitest run src/features`
  (19 files, 90 tests) and `tsc -b --noEmit` pass.
- 2026-10-19 — Completed W7 platform quality issues #83, #84, #86, and #87:
  vendored the generated API client and replaced hand-written model/service
  contracts; added typed error-code mapping and layered error boundaries;
  shipped a static-only installable PWA with prompted updates; and added
  lazy ICU locale bundles with CI validation. Full validation is recorded in
  the pull request.
- 2026-10-20 — Contributing: changelog entries now go in `changelog.d/` (one new file per
  PR) instead of being appended to this section, which used to put most open
  PRs into merge conflict on every merge. Maintainers fold them in with
  `node scripts/fold-changelog.mjs`. Also dropped the hard-coded test count
  from the README and documented the "edit only your own lines" rule in
  `AGENTS.md` and `CONTRIBUTING.md`. The conflict notifier now points authors
  at `changelog.d/`.
- 2026-10-21 — Phase W7: platform quality — data table, print/PDF, privacy-preserving
  analytics and a configurable router
  ([issue #116](https://github.com/DocForum/docforum-web/issues/116),
  [#117](https://github.com/DocForum/docforum-web/issues/117),
  [#118](https://github.com/DocForum/docforum-web/issues/118),
  [#119](https://github.com/DocForum/docforum-web/issues/119)).
  Generic `DataTable<T>` with URL-synced sort/filter/cursor state; `PrintLayout`
  with lazy-loaded `jspdf`/`html2canvas` export (never in the main bundle);
  cookieless self-hostable analytics with an event allowlist, DNT/GPC respect
  and URL scrubbing — no PHI, no third-party tracking; `BrowserRouter` by
  default with a `HashRouter` fallback for GitHub Pages plus a
  `HashRedirectShim` for old `#/path` links. Routing options are compared in
  `docs/adr/0001-routing-strategy.md`. typecheck, build and check:dist are
  green; 50 new tests.
- 2026-10-21 — Phase W5 pay with wallet ([issue #59](https://github.com/DocForum/docforum-web/issues/59)) and Phase W6 doctor
  verification review queue ([issue #64](https://github.com/DocForum/docforum-web/issues/64)).
  Pay with wallet: prepare (docforum-core) → sign (patient's wallet) → submit (docforum-core) → poll, as a stepper
  on the order card behind a default-off `VITE_PAY_WITH_WALLET` flag; expired prepared transactions re-prepare in
  one tap without losing the patient's place, wallet refusals land back at the start without error styling, and the
  browser never builds/simulates/submits anything (Stellar boundary check green). New `wallet.ts` bridge
  (injected-extension detection only), pure `wallet-pay.ts` reducer, `usePayWithWallet` poll, MSW
  prepare/submit/order-intents handlers.
  Verification queue: `/admin/verifications` pending queue (oldest first, submitted date, document count, 3-day/week
  age escalation) and `/admin/verifications/:doctorProfileId` detail with credential documents opened only via
  per-click short-lived signed URLs, decision history from the real audit trail, and approve/reject dialogs
  requiring a 10–500 character reason with `expectedUpdatedAt` conflict handling (`409`/`404` close and reload,
  `400`/`422` stay open). Decisions call the real `PATCH /doctors/:id/verification`; admin nav and dashboard link to
  it; MSW fixtures/handlers cover queue, detail, documents, decisions and audit history.
  Assumed contracts (core#80/#81 prepare/submit; queue/detail/signed-url endpoints, credential storage core#52)
  recorded in `ARCHITECTURE_ESSENTIALS.md`.
- 2026-10-21 — Phase W6: per-specialty verification review for admins
  ([issue #65](https://github.com/DocForum/docforum-web/issues/65), PRD
  §8.1.5). A new specialty claims queue at `/admin/verification` — the
  per-doctor verification queue (#64) decides a doctor account, this one
  decides each claimed doctor↔specialty pair, so a GP can't quietly list
  cardiology and receive cardiology referrals. Claims are grouped by doctor
  with the supporting credential beside each claim (opened via blob URL so
  the bearer token never lands in a link href, and a missing document is
  flagged as a judgement call); approve/reject per claim in one dialog,
  with a rejection requiring a doctor-facing reason saying what to fix or
  resubmit and an approval taking an optional audit note. No bulk actions,
  per the issue. Specialty and claim-age filters are server-side and
  synced to the URL; `expectedUpdatedAt` turns concurrent reviews into
  conflicts. New service functions live alongside #64's in
  `admin-verification-service.ts`; mock handlers serve the queue, filters,
  decisions (a bare rejection is a `422`) and credential bytes. **Built
  against assumed shapes:** docforum-core#51 hasn't landed; see
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
- 2026-10-21 — Malware scan: `.vue`, `.svelte`, `.astro`, `.less`, `.sass`, `.go`,
  `go.mod` and `go.sum` files are now scanned as code. Before this, a Vue
  single-file component was flagged HIGH as "disguised code" (JavaScript
  inside a file with a non-code extension), which wrongly blocked
  docforum-core #207. The same line rules still apply to these files.
- 2026-10-21 — Malware scan: closed three gaps found in the malicious docforum-web #137,
  which only had three of its nine problems flagged. Code pushed off-screen by
  leading whitespace is now flagged (`api.js` hid its payload behind 315 tabs).
  A `package.json` script such as `dev` or `build` that now also runs
  `node <file>` (or bun, deno, sh, bash, python) alongside its original command
  is flagged as `script-hijack`. The `global['!'] = …` marker of the loader used
  in escrow #163 and web #137 is flagged as `known-payload`. The whole-line
  heuristics no longer stop the per-line rules from running on the same file.
- 2026-10-21 — Malware scan: TLA+ specifications (`.tla`) are now scanned as text, like
  other source files. Before this, a TLA+ spec was flagged HIGH as "disguised
  code", which wrongly blocked docforum-escrow #225. Every line rule still
  applies to `.tla` files.
- 2026-10-22 — Phase W7: search across a user's own loaded records
  ([issue #126](https://github.com/DocForum/docforum-web/issues/126)).
  `src/features/search-records/` builds an in-memory index from only the active
  acting-for profile's care-thread cache or the signed-in doctor's
  appointment/message caches. Header search groups keyboard-navigable results
  and links to the corresponding record views; logout clears React Query data
  and profile changes discard the active query/index. `createRecordIndex` is the
  replacement seam for a future authenticated backend search service; no new
  API contract is assumed.
- 2026-10-23 — Phase W7: notification preferences, real-time updates, time zones and
  evaluated feature flags
  ([issue #108](https://github.com/DocForum/docforum-web/issues/108),
  [#109](https://github.com/DocForum/docforum-web/issues/109),
  [#110](https://github.com/DocForum/docforum-web/issues/110),
  [#111](https://github.com/DocForum/docforum-web/issues/111)).
  Notification preferences with role defaults, locked safety-critical rows and
  zone-aware quiet hours; a shared fetch-based SSE client with typed events,
  backoff, auth refresh, hidden-tab pause and React Query invalidation;
  app-wide IANA time-zone formatting with a persisted preference and dual-zone
  care-timeline display; and a typed evaluated-flag client gating the
  notification settings route/nav and realtime updates. API shapes for
  `/notifications/preferences`, `/events` and `/me/flags` are assumed pending
  docforum-core#99, #97 and #132, documented in `ARCHITECTURE_ESSENTIALS.md`
  "Known assumptions — Phase W7". The issue's booking-screen dual-zone
  requirement is not wired because this repo has no booking/appointment screens
  yet.
- 2026-10-24 — Added shared Playwright browser quality suites for #91–#94: MSW-backed routes,
  zero-baseline axe scans, 16 desktop/mobile snapshots, role journeys and exact
  payment call assertions. Pinned browser CI, HTML artifacts and baseline
  workflow added. Fixed existing accessibility defects and a malformed
  dark-theme CSS block. #93 and #94 remain open where their required product
  screens do not yet exist.
- 2026-10-24 — Upgraded `jspdf` 2.5.2 → 4.2.1 to clear a critical advisory (ReDoS/DoS) and the high-severity DOMPurify XSS advisories it carried (DOMPurify 3.4.17), and bumped the dev-only `vite` 6.4.3 → 6.4.5 and `source-map-js` 1.2.1 → 1.2.2. `npm audit --omit=dev` is now clean. The PDF export in `PrintLayout` uses only APIs unchanged in v4 (default export, `internal.pageSize`, `addImage`, `addPage`, `save`).
- 2026-10-25 — Fix e2e CI failures after W7 platform quality integration
  - Move `UpdatePromptContainer` inside `I18nProvider` (App.tsx) to resolve React Intl crash that blanked the app.
  - Wrap Delete Account policy lists in `<li>` elements to satisfy axe `list` rule on `/patient/settings`.
  - Update journey test to expect the new localized recoverable error message (`Something went wrong…`) instead of the raw mock message.
  - Add responsive mobile header wrapping (≤639px) so LanguageSwitcher, ProfileSwitcher, RecordSearch, and Log out no longer overflow horizontally.
  - Regenerate all visual snapshots (desktop + mobile) to reflect W7 UI changes (language selector, updated dashboard content, mobile header layout).
  All 79 Playwright tests (journeys, a11y-light, a11y-reduced, visual-desktop, visual-mobile) now pass. Unit tests, typecheck, and i18n check also pass.
- 2026-10-26 — PR #151: merged the latest `upstream/main` into the W7 platform-quality
  branch and resolved the resulting conflicts without dropping either side.
  Kept the W7 locale-aware formatting, offline/retry behaviour and
  accessibility fixes (headings, table captions, live regions, focus
  handling, dialog focus management, contrast tokens) while adopting
  upstream's time-zone display, record search, notification preferences,
  feature flags, SSE cache sync and mock-API coverage. Tests now run against
  the shared MSW handlers, including hanging handlers for the api-client
  timeout tests, so no test can fall through to a real backend.
- 2026-10-27 — Phase W7: PR preview builds, shared test utilities + coverage gate,
  consistent loading/empty/error states, and the notification centre
  ([issue #104](https://github.com/DocForum/docforum-web/issues/104),
  [#105](https://github.com/DocForum/docforum-web/issues/105),
  [#106](https://github.com/DocForum/docforum-web/issues/106),
  [#107](https://github.com/DocForum/docforum-web/issues/107)).
  Every PR now gets a mock-API preview build, attached to the PR as a
  downloadable artifact and commented by `pr-preview-comment.yml`; nothing is
  published to GitHub Pages or any other shared origin. The build runs
  unprivileged on `pull_request`, and the comment job resolves fork PRs from the
  run's head SHA/branch, so fork code never sees a write token or a secret.
  Artifacts are private and expire after 14 days, and previews are built against
  a reserved-invalid API URL checked by `npm run check:preview` — they can never
  reach the real backend.
  Tests now share `renderWithProviders`, typed factories and one MSW server, and
  CI enforces v8 coverage thresholds on `src/features/` and `src/services/`
  (`npm run test:coverage`). `src/components/states/` provides `Skeleton`,
  `EmptyState`, `InlineError`, `PageError` and `QueryState`, applied across the
  query-driven views; the notification bell and `/notifications` inbox add
  cursor pagination, per-kind deep links (generic fallback for unknown kinds),
  mark-one/mark-all read, SSE via a single-use stream ticket and cross-tab badge
  consistency.
  The notification API is assumed until docforum-core#93 lands — see
  `ARCHITECTURE_ESSENTIALS.md` → "Known assumptions (issue #107)". Preview
  artifacts need no repository settings or secrets; see `CONTRIBUTING.md` →
  "Preview builds".
- 2026-10-27 — Phase W4: API keys and webhooks management for facility system integrations
  ([issue #55](https://github.com/DocForum/docforum-web/issues/55)).
  Added `/facility/integrations` with an API key list (prefix, created, last
  used), create with a one-time secret (copy + warning, dropped from the
  mutation cache and DOM when the dialog closes), and revoke with
  confirmation. Webhook endpoints list URL and event subscriptions, create
  with a one-time HMAC signing secret, send a test delivery, and show recent
  deliveries with status and redelivery. Owner-only access notice, integration
  docs link, and the facility tab nav/header nav updated. New
  `src/features/integrations/` (components, hooks, CSS module),
  `src/services/integrations-service.ts`, types in `models.ts`, MSW
  handlers/fixtures and handler tests. API shapes are assumed pending
  `docforum-core`#125/#126, recorded in `ARCHITECTURE_ESSENTIALS.md` "Known
  assumptions — Phase W4".
- 2026-10-27 — Restored the required CI check name, `Frontend (typecheck + test + build)`;
  the lint step remains in the job.
- 2026-10-27 — Phase W4: partial fulfilment — dispense some items and route the rest elsewhere
  ([issue #54](https://github.com/DocForum/docforum-web/issues/54)).
  The facility queue now carries item-level quantities (prescribed / dispensed /
  outstanding) and can dispense or reject a single item instead of a whole order;
  order-level `partially_fulfilled` is derived from the item rows. Patients get
  an order list and detail page under `/patient/orders`, an "Get remaining items
  elsewhere" flow that routes only the outstanding items to a second facility
  via an eligible-facility picker, and a payment callout that renders
  `docforum-core`'s release rule verbatim — no client-side release amount is
  computed. Items dispensed elsewhere are blocked and disabled, and a 409 from
  `docforum-core` is surfaced as "another facility dispensed this first".
  **Assumed contract.** The item-level fulfilment endpoints, the eligible-facility
  list and the payment-release rule are assumed pending `docforum-core`#73; the
  shapes are recorded in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
  The partial-fulfilment item row is modelled as `OrderItemFulfillment` in
  `src/types/models.ts`, not `OrderItem` — `OrderItem` is `main`'s plain order
  line item (`name` / `note`), a different concept, and the two would otherwise
  collide in the same module.
- 2026-10-27 — Restored the `fix/w1-gaps-issues-9-12` → `main` merge so CI runs again. The
  conflict resolution had taken `main`'s side of `package.json` and
  `src/store/auth-store.ts` wholesale, which dropped the `lint` script and
  `@eslint/js` (so `npm run lint` could not start), and removed the CSRF token
  plus the boot-refresh `status`/`beginAuthCheck`/`endAuthCheck` state that
  `RequireSession`, `session.ts`, `api-client.ts` and the mock role switcher
  call — typecheck failed with 25 errors. Both are merged rather than re-picked,
  so idle-timeout sign-out (`signOutDueToIdle`, issue #82) and silent re-auth on
  reload (issue #9) coexist; a timeout sign-out now also clears the CSRF cookie,
  so reload cannot silently re-authenticate on a shared device. The committed
  lockfile was also missing 24 transitive packages, so `npm ci` refused to
  install at all.
  Also fixed the five real lint errors the newly-runnable config found
  (an intentional `case` fall-through in `OrderPaymentPanel`, a useless
  `refreshed` flag in `event-stream-service`, `{}` in the analytics event map,
  and a Playwright fixture `use` callback flagged as a React hook), and pinned
  the browser clock in `e2e/visual.spec.ts`: mock fixtures carry absolute dates,
  and Tyke's handover invite expires on 2026-10-25T09:00Z, so the day it passed
  the patient hub grew an "Invite expired" card and every visual run went red
  with no code change. Verified from a clean `npm ci`: typecheck, lint, 1278
  unit tests, build, `check:dist` and all 79 Playwright tests pass.
  Known gap found while fixing this, not fixed here: mock mode has no handlers
  for `GET /patients/me` or `GET /appointments/mine`, so the patient dashboard
  shows its "some of your information could not be loaded" banner and no
  "Coming up" section under `npm run dev:mock`.
- 2026-10-28 — PR #158 now incorporates the latest `main` while retaining invitation redemption,
  CSRF-aware mock sessions, idle-timeout handling, and the routes and documentation
  added on both branches.
- 2026-10-29 — Fixed the blank home page hero on GitHub Pages. The production CSS minifier
  rewrites motion duration tokens such as `100ms` as `.1s`, and
  `motionDuration()` (`src/hooks/useMotion.ts`) rejected the leading dot, so the
  hero animation threw after hiding its targets and left the headline, subtitle
  and call-to-action at opacity 0 (since #189). The parser now accepts the
  minified form, and `useMotion` fails open: if an animation setup throws, it
  reverts the GSAP context so the content is shown without animation.
- 2026-10-30 — Phase W4: facility settings — location, opening details and price list
  ([issue #56](https://github.com/DocForum/docforum-web/issues/56)).
  - `Location & contact` editor: street address, city, phone/email, OSM map with a click-to-move pin, always-visible latitude/longitude fields as the keyboard-accessible alternative to the map, and per-day opening hours (open/close times with a closed toggle). Required-field, coordinate-range, email-format and opening-time-ordering validation; save/discard with an unsaved-changes guard.
  - `Price list` editor: catalog search (name or code), per-asset price entry (XLM/USDC), an effective-from timestamp, and a newest-first version history labelled current / scheduled / superseded. Decimal input is converted to BigInt-safe stroops client-side with per-asset decimal limits (7), rejecting over-precise, negative, zero and non-numeric amounts before any request. A prominent notice states that existing PaymentIntents keep their snapshotted amount, so price changes never reprice an existing payment.
  - Unsaved-changes guard works with `HashRouter` (capture-phase anchor interception + `beforeunload`) since it isn't a data router.
  - New `facility-settings` service/hooks/feature, `/facility/settings` route (facility-role-gated), Settings links in the header nav and every facility page tab bar, and mock handlers/fixtures for settings, catalog and price history. API shapes are assumed pending `docforum-core#74`/`#127`, recorded in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
  - Desktop and mobile screenshots in `screenshots/`.
  - After merging `main`, de-duplicated the `fac-main` price seed so each catalog item's version history loads once, and refreshed the facility-dashboard visual baselines in the CI Playwright image for the new Settings tab.
