---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W7 — Platform quality (issues #116–#119)
---
#### Data router, loaders and route guards (issue #112)
- Routes are data-router route objects: one factory per area in `src/routes/<area>.tsx`, assembled by `createAppRoutes({ queryClient })` in `src/routes/index.tsx`. The browser (`src/router.ts`), tests (`renderAppAt` in `src/test/render-app.tsx`) and the prerender (`createStaticHandler` in `src/prerender/entry-server.tsx`) all use that one table.
- Every page is a `lazy` route (`lazyPage(() => import(...), 'ExportName')`). `src/routes/route-helpers.test.tsx` fails if a page route is added eagerly. `main.tsx` resolves only the first URL's lazy modules before the first render (no blank flash); everything else loads on navigation.
- Role guards are loaders, not components: `guardedSection(id, roles, children)` gives each child `requireRoles(roles, prefetch)` (waits for the boot session restore, then redirects to `/login` or `/`, same as the old `RequireAuth`) and the section a `RoleGate` element (re-checks live on sign-out/idle timeout) and an `errorElement`. The guard sits on each child loader because React Router runs parent and child loaders in parallel; that is what guarantees no prefetch fires before the guard decides.
- Prefetch: a child's `prefetch(args, token)` calls `queryClient.ensureQueryData(...)` with the same `queryOptions` factory its page's hook uses, wrapped in `settlePrefetch` (waits at most `PREFETCH_BUDGET_MS`, never rejects — a failed prefetch leaves the page's own error state to report it). Add a factory next to the hook when prefetching a new page; never duplicate a key.
- Errors: loader, lazy-chunk and render failures inside a section render `RouteErrorElement` inside the layout's `<main>`; "Try again" reloads (the reliable fix for a stale chunk after a deploy). Render errors inside a mounted page are still caught by the route `ErrorBoundary` in `Layout`.
