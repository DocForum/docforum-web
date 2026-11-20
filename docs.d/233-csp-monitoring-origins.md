---
file: ARCHITECTURE_ESSENTIALS.md
section: Privacy and platform guarantees
---
### CSP and monitoring origins (issue #233)

The production `Content-Security-Policy` is built by `buildProductionCsp`
(`src/utils/csp.ts`) and injected as a meta tag by `vite.config.ts`. Its
`connect-src` is `'self'`, the configured API origin, and — only when those
variables are set — the exact Sentry ingest origin derived from
`VITE_SENTRY_DSN` and the exact origin of `VITE_ANALYTICS_ENDPOINT` (for
example `https://analytics.example.com`). Origins are never wildcarded.

A variable that is set but is not an absolute https URL fails `npm run
build` with a message naming it, so a typo cannot ship a policy that
silently blocks the events. With neither variable set the policy is
unchanged. Preview builds keep the reserved-invalid API host and gain no
monitoring origins unless the preview workflow sets them.
