Phase W7: deep links survive login ([issue #226](https://github.com/DocForum/docforum-web/issues/226)).
`RequireAuth` now records the attempted path in router state (`state.returnTo`),
and `LoginPage` consumes it via `safeReturnPath()` with a role-based allowlist,
preventing open redirects while restoring the originally requested page after
authentication.
