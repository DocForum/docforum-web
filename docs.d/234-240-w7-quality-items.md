---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Route-metadata breadcrumbs. Tracked as [issue #234](https://github.com/DocForum/docforum-web/issues/234): `src/navigation/breadcrumbs.ts` maps path patterns to a translated label and parent, so crumbs never link to a path without a route and never render raw ids.
- [x] Complete role navigation. Tracked as [issue #231](https://github.com/DocForum/docforum-web/issues/231): patient orders and payments, facility insights and settings; grouped secondary entries keep the desktop bar on one line at 1280px and the drawer reuses the same list.
- [x] One sign-out helper for every path. Tracked as [issue #227](https://github.com/DocForum/docforum-web/issues/227): `src/services/sign-out.ts` clears the auth session, CSRF token, query cache, profile store, unsaved-changes store and app caches.
- [x] Landscape orientation for the installed app. Tracked as [issue #240](https://github.com/DocForum/docforum-web/issues/240): no PWA orientation lock, compact drawer navigation below 900px, and a landscape Playwright project at 740x360.
