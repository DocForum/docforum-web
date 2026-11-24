---
file: ROADMAP.md
section: Changelog
---
- 2026-11-24 — Fixed PR #373's signed-out header regression check: the account
  chip and mobile drawer account section now require both a user and access
  token, consuming the `isSignedIn` guard and restoring typecheck.
