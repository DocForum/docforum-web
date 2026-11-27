---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] One meaningful `<h1>` per page. Tracked as [issue #238](https://github.com/DocForum/docforum-web/issues/238): the app shell no longer adds a route-derived `<h1>`, pages own their heading, and `e2e/accessibility.spec.ts` enforces exactly one `<h1>` per route in `e2e/routes.ts`.
