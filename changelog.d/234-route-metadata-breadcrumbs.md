Phase W7: breadcrumbs come from route metadata instead of raw URL segments
([issue #234](https://github.com/DocForum/docforum-web/issues/234)).
`src/navigation/breadcrumbs.ts` maps path patterns to a human label and
parent, so a crumb only links when a matching route exists; dynamic ids are
never rendered as labels and the current crumb uses the page's own title.
Crumb labels and the breadcrumb nav's accessible name are translated. Tests
cover doctor consultation, care threads, patient charts and role dashboards.
