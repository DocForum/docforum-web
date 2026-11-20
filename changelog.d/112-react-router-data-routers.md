Phase W7: routing migrated to React Router data routers
([issue #112](https://github.com/DocForum/docforum-web/issues/112)). The route
table is now route objects (`src/routes/<area>.tsx`, assembled by
`createAppRoutes` in `src/routes/index.tsx`) mounted with
`createBrowserRouter`/`createHashRouter` (same `VITE_USE_HASH_ROUTER` switch,
same GitHub Pages semantics). Every page is a `lazy` route module; each
role-guarded section has its own `errorElement`. `<RequireAuth>` is replaced
by loader guards (`src/routes/guards.ts`) that still wait for the boot session
restore (#9) and redirect exactly where it did, plus `RoleGate` to keep the
decision live while a page is open. Loaders prefetch React Query data
(`ensureQueryData`) in parallel with the page chunk, so key pages no longer
fetch only after rendering. The prerender uses the static data-router APIs.
Tests render the real table with `renderAppAt` (`src/test/render-app.tsx`).
