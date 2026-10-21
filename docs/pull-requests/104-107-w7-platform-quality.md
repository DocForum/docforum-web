# [Phase W7] Platform quality: PR previews, test utilities + coverage gate, consistent states, notification centre

Closes #104, closes #105, closes #106, closes #107

---

## Summary

One PR for the four Phase W7 platform-quality issues:

| Issue | What it asks for | Where it lives |
| --- | --- | --- |
| [#104](https://github.com/DocForum/docforum-web/issues/104) | Preview deployment for every PR (mock API), commented, cleaned up, fork-safe | `.github/workflows/pr-preview-{build,deploy,cleanup}.yml`, `scripts/check-preview-dist.mjs` |
| [#105](https://github.com/DocForum/docforum-web/issues/105) | Shared test utilities, typed factories, one MSW server, v8 coverage gate in CI | `src/test/{render.tsx,factories.ts,server.ts}`, `vite.config.ts`, `.github/workflows/ci.yml` |
| [#106](https://github.com/DocForum/docforum-web/issues/106) | Consistent skeleton / empty / inline-error / page-error states across the app | `src/components/states/` + the query-driven views that consumed them |
| [#107](https://github.com/DocForum/docforum-web/issues/107) | Notification bell, inbox, deep links, mark-as-read, live updates | `src/features/notifications/`, `src/services/notifications-service.ts`, `src/pages/NotificationsPage.tsx` |

`ROADMAP.md` (W7 items ticked), `ARCHITECTURE_ESSENTIALS.md` (new sections + "Known assumptions (issue #107)") and `CONTRIBUTING.md` ("Preview deployments") are updated, and the changelog entry is in `changelog.d/104-107-w7-platform-quality.md` per the repo's changelog.d rules.

---

## Issue #104 — Preview deployments for every pull request

### Security model (the thing to review)

Fork PR code must never get a write token or a secret, so the pipeline is split in two:

```
pull_request (fork code runs)          workflow_run (fork code never runs)
pr-preview-build.yml  ──artifact──▶  pr-preview-deploy.yml
  permissions: contents: read             permissions: contents/pull-requests: write
  no secrets                             downloads the artifact, copies the bytes to
  runs typecheck + tests + build           gh-pages/<repo>/pr-preview/pr-<n>/, comments the URL
  in mock-API mode
```

- **`pr-preview-build.yml`** — on `pull_request`: checkout of the PR, `npm ci`, typecheck, tests, and `npm run build:preview` in mock-API mode, uploading `dist/` as an artifact. `permissions: contents: read`, no secrets — for a fork PR a `pull_request` token is read-only anyway, and nothing here needs either.
- **`pr-preview-deploy.yml`** — on `workflow_run` (after the build): has write permissions, but **never checks out or executes the PR**. It only downloads the artifact and copies its bytes into `pr-preview/pr-<n>/` on `gh-pages`, then upserts one PR comment with the preview URL. Both it and `deploy-pages.yml` push to `gh-pages`, so they share one concurrency group (`pages-publish`) — a main deploy can never delete a preview and vice versa.
- **`pr-preview-cleanup.yml`** — on `pull_request_target: [closed]` (needed for a write token on a fork PR), deletes `pr-preview/pr-<n>/` and the preview comment. Safe for the same reason: the PR is never checked out and no PR code or artifact is read; the only input is the PR number.

### Previews can never reach the real backend

- The preview build sets `VITE_API_BASE_URL=https://mock-api.invalid` (a reserved, guaranteed-unroutable name), so even a request that escapes MSW has nowhere to go.
- The CSP `connect-src` in `vite.config.ts` and the `index.html` preconnect now follow the configured API origin, so a preview's HTML/CSP never mentions the real Render host either.
- **`npm run check:preview`** (`scripts/check-preview-dist.mjs`) fails the build if the mock API markers (`setupWorker`, the dev panel, the fixtures' scenario labels) are missing from `dist/` or if the real API host or the production Pages origin appears anywhere in it. CI-equivalent guard rails both ways: `check:dist` proves production has no mocks, `check:preview` proves a preview is nothing but mocks.
- `VITE_BASE_PATH=/docforum-web/pr-preview/pr-<n>/` serves each PR under its own subpath; `VITE_USE_HASH_ROUTER=true` keeps deep links working on a static host (see ADR 0001). `deploy-pages.yml` preserves the `pr-preview/` directory when it publishes `main`.

### One-time setup for maintainers

Documented in `CONTRIBUTING.md` → "Preview deployments": set the Pages source to the `gh-pages` branch once (or point the deploy job at a Cloudflare/Netlify host). No secrets are required for previews at all.

### Bug found and fixed while verifying

`src/main.tsx` originally used a **top-level `await import('./mocks/setup')`** behind the mocks flag. That compiled in dev but **failed the production-target build** with `Top-level await is not available in the configured target environment` — so the preview workflow would have been red on day one. The dynamic import now lives inside an async `boot()` that still completes before the first render (the persona session exists when route guards evaluate; deep links still don't bounce to `/login` mid-boot), and the statically-dead branch keeps the mocks chunk out of production builds — `npm run check:dist` confirms it.

---

## Issue #105 — Test utilities and coverage gate

- **`src/test/render.tsx`** — `renderWithProviders(ui, { route, role, session })`: fresh `QueryClient` per test (retries off, so a failing query fails the test instead of silently retrying), `MemoryRouter` at a chosen route, optional signed-in role/session. `signInAs(role)` and `resetTestStores()` for tests that set up state directly; plain `render` stays as the entry point existing suites already use.
- **`src/test/factories.ts`** — typed factories mirroring `src/types/models.ts` (`makeUser`/`makePatientUser`/…, `makeLabOrder`, `makePaymentIntent`, `makeNotification`, …). Ids come from a deterministic counter and timestamps from a fixed clock, so assertions on generated ids stay stable; `resetFactorySeq()` resets both.
- **`src/test/server.ts`** — a single MSW server over `src/mocks/handlers.ts`, started/reset/closed once per run from `src/test/setup.ts` with `onUnhandledRequest: 'bypass'`. `src/mocks/handlers.test.ts` now shares it instead of starting a second server (two servers in one worker double-intercept requests).
- **Coverage gate** — v8 coverage over `src/features/**` and `src/services/**` (tests, stories, `.d.ts` and feature barrels excluded) with thresholds in `vite.config.ts` set at the floor measured when the gate landed: statements 78 / branches 70 / functions 77 / lines 79. They ratchet up as tests land, never down. CI's `npm test` step is now `npm run test:coverage`, so a coverage regression fails the build.
- **Refactored onto the utilities as examples:** `src/features/auth/components/SignupForm.test.tsx` (hand-rolled render + per-test server → `renderWithProviders` + the shared server) and `src/features/orders/components/OrdersList.test.tsx` (hand-made fixtures → factories + `signInAs('patient')`).

---

## Issue #106 — Consistent loading, empty and error states

New `src/components/states/` module, using the existing design tokens:

- **`Skeleton`** — placeholder bars announced with `role="status"` + a visually hidden "Loading…", and a `prefers-reduced-motion` fallback (no shimmer for users who asked for less motion).
- **`EmptyState`** — icon slot, title, description, and a **required next action** (button or link) — an empty list always tells the user what to do next.
- **`InlineError`** — for a failed section inside a working page; optional retry button.
- **`PageError`** — route-level failure with a retry affordance.
- **`QueryState`** — the React Query glue: picks loading / error / empty / content from a query result, plus `queryErrorMessage(error)` for consistent, non-leaky messages (timeout, abort, API `message`, unknown fallback).

Applied across the query-driven views instead of hand-rolled spinners and blank screens: patient dashboard, orders list/detail/finder, payments (intent panel, payout ledger), care hub/timeline, consultation note, dependents, health profile, doctor today/inbox/message thread/composer, facility queue/team/insights, results inbox, calendar subscription, patient chart, queue panel, and the admin consoles (audit, closures, disputes, feature flags, jobs, readiness, referrals). `src/components/states/states.stories.tsx` documents every state in CSF (picked up by Storybook once #97 lands) and `states.test.tsx` asserts the accessibility contract (status role, reduced motion, focusable retry).

---

## Issue #107 — Notification centre

New `src/features/notifications/` plus `src/services/notifications-service.ts`:

- **Bell** (`NotificationBell`) — server-backed unread count in the header for every role, with a dropdown of the most recent notifications.
- **Inbox** (`/notifications`, `NotificationList` + `NotificationsPage`) — cursor-paginated list, per-kind deep links, mark-one and mark-all read, per-role "you have no notifications yet" empty state.
- **Kind → destination mapping** (`notification-meta.ts`) — every notification kind maps to a role-aware route and an icon; **unknown kinds render generically** (safe fallback route per role) instead of dead-linking. `safeAppPath()` rejects anything that isn't an in-app path, so a malicious server payload can never push the UI off-origin.
- **Live updates** (`useNotificationLiveUpdates`) — a single SSE stream per session, opened with a **single-use stream ticket** from `POST /notifications/stream-ticket` — the access token never appears in a URL. Events fold into the React Query cache (`notifications-cache.ts`), so the list, the dropdown and the badge all update from one code path. A dropped stream falls back to the existing 60-second polling; the reconnect budget is capped so a downed backend isn't hammered.
- **Cross-tab consistency** (`notifications-channel.ts`) — a `BroadcastChannel` syncs read-state and new-notification events between tabs of the same account (ids only; the pushed payload is the same PHI-light object the server would send anyway).
- **PHI-light by design** — notifications render only kind, title, short body, timestamp and route; no patient details are stored client-side beyond the payload the server sends.
- **Mock support** — fixtures + MSW handlers (`src/mocks/handlers/notifications.ts`) so the whole flow works under `npm run dev:mock` and in PR previews.

### Assumed API contract (dependency not landed)

Depends on **DocForum/docforum-core#93**, which has not landed yet. The assumed shape is recorded in `ARCHITECTURE_ESSENTIALS.md` → "Known assumptions (issue #107)" and mirrored in `src/types/models.ts`:

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/notifications?cursor=&limit=` | cursor-paginated `NotificationPage` + `unreadCount` |
| `GET` | `/notifications/stream-ticket` | single-use ticket for the SSE stream |
| `GET` | `/notifications/stream?ticket=` | `text/event-stream` of notification events |
| `PATCH` | `/notifications/:id/read` | mark one read |
| `PATCH` | `/notifications/read-all` | mark all read |

All calls go through `docforum-core`'s API via `apiFetch` — no direct Stellar/escrow calls (architecture hard rule 1). If the real endpoints differ, the only places to change are `src/types/models.ts`, `src/services/notifications-service.ts` and the MSW handlers.

---

## Acceptance checklist

- [x] #104 Preview workflow + PR comment + cleanup, fork-safe (`pull_request` build with no secrets → `workflow_run` publish that never runs PR code).
- [x] #104 Previews are mock-API-only and provably cannot reach a real backend (`check:preview`).
- [x] #104 Documented in `CONTRIBUTING.md`.
- [x] #105 `renderWithProviders` (role/session/router/fresh QueryClient), typed factories, single MSW server.
- [x] #105 v8 coverage gate on `src/features/` + `src/services/`, enforced in CI, thresholds at measured floor (ratchet up only).
- [x] #105 Two existing tests refactored onto the utilities as examples.
- [x] #106 `Skeleton` / `EmptyState` / `InlineError` / `PageError` / `QueryState` with tests and stories.
- [x] #106 Applied to every existing query-driven view (no more blank screens while loading).
- [x] #107 Bell with unread count, cursor-paginated inbox, deep links per kind, generic rendering for unknown kinds.
- [x] #107 Mark one / mark all read; live updates via SSE (single-use ticket) + cross-tab sync; polling fallback.
- [x] `ROADMAP.md` items ticked; changelog entry in `changelog.d/`; `ARCHITECTURE_ESSENTIALS.md` updated including "Known assumptions (issue #107)".

---

## Tests

New: `src/test/factories.ts`, `src/test/server.ts`, `src/components/states/states.test.tsx`, `src/features/notifications/{notification-meta,notifications-cache}.test.ts`, `src/features/notifications/components/{NotificationBell,NotificationList}.test.tsx`, `src/features/notifications/hooks/useNotifications.test.tsx`.

### Results

```
npm run typecheck               # clean
npm run test:coverage           # 99 files, 841/841 tests passing
                                #   Statements 78.13%  Branches 70.46%  Functions 77.30%  Lines 79.55%
                                #   (all above the gate; gate fails the run if any drops below)
npm run check:dist              # ✓ no mock code in production bundle
npm run check:preview           # ✓ preview build uses the mock API only (preview-mode build)
npm run check:stellar-boundary  # ✓ no direct Stellar/escrow calls in src/
```

No screens changed visually except the added notification bell and `/notifications` inbox, so no screenshots are attached for #104/#105/#106 (a preview URL is posted on the PR for #107's new screens).

---

## PRD flows

Notification centre implements the PRD §4 notification flow (FR-15 / FR-16: patients and doctors notified of bookings, referrals, orders and results — the in-app half; email/SMS remain the away-from-app channel). The other three issues are platform/infrastructure work with no new PRD surface. No `docforum-escrow`/Stellar calls are added anywhere (hard rule 1 — enforced by `check:stellar-boundary`).

---

## How this will be reviewed

- **#104 fork safety:** read `pr-preview-build.yml`'s `permissions`/`secrets` and confirm `pr-preview-deploy.yml` and `pr-preview-cleanup.yml` never contain a `checkout` of the PR ref. The only untrusted input that reaches a privileged job is the PR number.
- **#104 "previews can't reach the backend":** `npm run check:preview` is the mechanical proof; the built `index.html` in a preview has `connect-src 'self' https://mock-api.invalid`.
- **#105 gate:** drop a covered line in a feature file and watch `npm run test:coverage` fail.
- **#106:** every query-driven view now renders `Skeleton` → `EmptyState`/`InlineError` → content; grep a screen for `isLoading` to spot one that still hand-rolls it.
- **#107:** deep links per notification kind, unknown-kind fallback, and the fact that the stream URL carries a single-use ticket and never the access token.

## Follow-ups / notes for maintainers

- When DocForum/docforum-core#93 lands, reconcile the assumed notification contract above and delete the MSW-only shapes if they differ.
- Raise the coverage thresholds as tests land — never lower them.
- Maintainers should flip the one-time Pages source switch (or point the deploy job at the chosen static host) before the first preview appears.
