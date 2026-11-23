### Demo mode for the public preview (issue #127)

Assumed behaviour of the in-browser demo; nothing here adds a
`docforum-core` endpoint, and every request still goes through
`src/services/` → `apiFetch`.

- **Entry and scope.** `?demo=1` (or `?demo=true`) is read once in
  `src/main.tsx`; matching URLs dynamically import `src/demo/bootstrap.tsx`,
  which starts an MSW browser worker and only then renders the app. Any URL
  without that parameter runs the normal app and never downloads mock code.
  A full page load is deliberate: clicking "Try the demo" navigates, so the
  demo document has its own React Query cache, Zustand stores and in-memory
  fixtures.
- **Blocking the real API.** After the seeded handlers, `src/demo/block-real-api.ts`
  appends one catch-all MSW handler per assumed real origin — the configured
  `VITE_API_BASE_URL` plus the local-dev default `http://localhost:4000` —
  answering `503 { message }` for any path a mock handler didn't cover. This
  assumes those two origins are the only ones the app can call; a new API
  origin must be added there. `onUnhandledRequest` logs (never forwards) API
  URLs, and unrelated requests (fonts, images) pass through untouched.
- **Service worker URL.** Registration uses
  `${import.meta.env.BASE_URL}mockServiceWorker.js`, so the Pages preview at
  `/docforum-web/` finds the worker next to the app. `public/mockServiceWorker.js`
  is required in every deployment that offers the demo.
- **Roles and seeded data.** The picker offers patient, doctor, facility and
  admin, applying the same seeded personas as `dev:mock`
  (`activateMockRole`). The chosen role is stored in **sessionStorage** under
  `docforum-demo-role` — a client-only UI preference, like the theme key, not
  server-derived data. Unknown values are ignored. Switching role clears the
  QueryClient first so one persona's cached responses can never be shown
  under another. All fixture names carry "(fake)" and every email ends in
  `@example.test`.
- **Exit.** "Exit demo" removes the role key and does a full navigation to
  the same path without `?demo`, discarding the worker, caches and fixtures
  with the document.
- **Bundling.** `vite.config.ts` puts `src/mocks/**` and `src/demo/**` into a
  single `demo-<hash>.{js,css}` chunk. `scripts/check-dist-no-mocks.mjs`
  skips exactly `demo-*` files and still fails if mock markers appear in any
  other built asset, so a static import of demo code into the app is caught.
- **Mock coverage added for the demo.** `src/mocks/handlers/admin.ts` and
  `src/mocks/fixtures-admin.ts` cover the W6 admin screens
  (`/admin/audit-events`, `/admin/access-logs`, `/admin/referrals`,
  `/admin/doctors`, `/health/ready`, `/admin/jobs`, `/admin/jobs/:name/run`,
  `/admin/outbox`, `/admin/flags`, `PATCH /admin/flags/:key`);
  `src/mocks/handlers/facility-orders.ts` and `src/mocks/fixtures-facility.ts`
  cover `/facilities/:id/payout-ledger` and `/facilities/me/verify-order`.
  Their shapes mirror `src/types/models.ts` exactly, which means the W4/W6
  "Known assumptions" above continue to be the single source of truth for
  what the real backend must eventually return.
