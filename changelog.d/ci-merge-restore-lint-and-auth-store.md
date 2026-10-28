Restored the `fix/w1-gaps-issues-9-12` → `main` merge so CI runs again. The
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
