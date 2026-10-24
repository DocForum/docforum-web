Phase W7: platform quality — data table, print/PDF, privacy-preserving
analytics and a configurable router
([issue #116](https://github.com/DocForum/docforum-web/issues/116),
[#117](https://github.com/DocForum/docforum-web/issues/117),
[#118](https://github.com/DocForum/docforum-web/issues/118),
[#119](https://github.com/DocForum/docforum-web/issues/119)).
Generic `DataTable<T>` with URL-synced sort/filter/cursor state; `PrintLayout`
with lazy-loaded `jspdf`/`html2canvas` export (never in the main bundle);
cookieless self-hostable analytics with an event allowlist, DNT/GPC respect
and URL scrubbing — no PHI, no third-party tracking; `BrowserRouter` by
default with a `HashRouter` fallback for GitHub Pages plus a
`HashRedirectShim` for old `#/path` links. Routing options are compared in
`docs/adr/0001-routing-strategy.md`. typecheck, build and check:dist are
green; 50 new tests.
