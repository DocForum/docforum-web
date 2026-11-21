---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Migrate to React Router data routers with loaders and route-level error elements. Tracked as [issue #112](https://github.com/DocForum/docforum-web/issues/112) (High, 200 pts) — `src/routes/` route objects with lazy pages, loader guards (`guards.ts`, waits for #9's session restore) + `RoleGate`, `errorElement` per section, `ensureQueryData` prefetch in loaders.
