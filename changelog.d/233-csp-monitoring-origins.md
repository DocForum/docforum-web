Phase W7: the production CSP now allows the monitoring endpoints it is
configured to use ([issue #233](https://github.com/DocForum/docforum-web/issues/233)).
The policy is built by `buildProductionCsp` in `src/utils/csp.ts`: the
Sentry ingest origin derived from `VITE_SENTRY_DSN` and the analytics
origin from `VITE_ANALYTICS_ENDPOINT` are appended to `connect-src` only
when those variables are set, and only as exact origins — never a
wildcard. A variable that is set but is not a valid https URL now fails the
build with a message naming it, instead of silently shipping a policy that
blocks the requests. Unconfigured builds produce an identical CSP to
before.
