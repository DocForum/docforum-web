---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Assign React Query stale times by data family. Tracked as [issue #309](https://github.com/DocForum/docforum-web/issues/309). Reference lists stay warm, profile data is fresh for two minutes, notifications for ten seconds, and payments, queues and appointments remain live. Writes still invalidate affected keys and sign-out clears the cache.
