---
file: ROADMAP.md
section: Phase W6 — Admin console
---

- [x] Clear a user's login lockout after repeated failed sign-ins. Tracked as
  [issue #275](https://github.com/DocForum/docforum-web/issues/275):
  `src/features/admin-system/components/LoginLockoutsPanel.tsx` on
  `/admin/system`, email validation and confirmation before sending the real
  `POST /auth/login-attempts/clear`; reports only the number of throttle
  buckets cleared, never whether an account exists.
