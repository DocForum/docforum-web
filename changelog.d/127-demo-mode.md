# 127 — Demo mode for the public preview

`?demo=1` (linked from the landing page as "Try the demo") boots the app on
the in-browser MSW mock API with seeded, obviously-fake data and a role
picker for patient, doctor, facility and admin. A persistent bottom banner
("Demo — no real data") offers role switching and a clean exit; any request
to a real API origin that a mock handler doesn't answer is refused with a
`503`, so nothing reaches the backend. Demo code lives in `src/demo/` and is
compiled in only when the build sets `VITE_DEMO_MODE=true`; production builds
contain none of it.

Adds mock handlers and fixtures for the admin console (audit + access logs,
stuck referrals, system health, feature flags) and the facility payout
ledger and verify-order endpoints, so every built screen is explorable
without a backend.
