Phase W7: every route now has exactly one meaningful `<h1>`
([issue #238](https://github.com/DocForum/docforum-web/issues/238)). `Layout`
no longer renders a route-derived `PageHeader` ("Doctor · Apt Demo 2"), so
pages own their heading. `PageHeader` gives its heading a fixed `page-title` id
(overridable with `titleId`) instead of one built from the breadcrumb label
with spaces in it. Screens that only had the shell's heading in some states
now render their own: notifications inbox, patient chart, intake, appointment
loading state, dispute detail loading/error/not-found states, and route- or
app-level error fallbacks (`ErrorBoundary` uses `<h1>` there, `<h2>` for a
section). `CatalogConsole` no longer nests a second `<main>`. An e2e check in
`e2e/accessibility.spec.ts` asserts one `<h1>` per route in `e2e/routes.ts`,
with no fixture id in its text and a whitespace-free `id`.
