---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Spanish localization for patient orders and payments ([issue #250](https://github.com/DocForum/docforum-web/issues/250)) and the admin audit, disputes and feature-flag consoles ([issue #248](https://github.com/DocForum/docforum-web/issues/248)).
- [x] Axe coverage for the admin consoles and keyboard/focus-restoration tests for resolution, flag-change, referral-reassignment and verification-decision dialogs. Tracked as [issue #247](https://github.com/DocForum/docforum-web/issues/247); `e2e/axe-allowlist.json` remains empty.
- [x] Align live-queue appointment reads and visit mutations with docforum-core (`GET /appointments/doctor/today`, `PATCH /appointments/:appointmentId/start`, `PATCH /appointments/:appointmentId/complete`), preserving the four-second undo window and conflict rollback. Tracked as [issue #236](https://github.com/DocForum/docforum-web/issues/236). Queue-position and running-delay endpoints remain documented assumptions.
