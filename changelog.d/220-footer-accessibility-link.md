Phase W7: the footer's "Accessibility" link now opens the accessibility
statement ([issue #220](https://github.com/DocForum/docforum-web/issues/220)).
`/accessibility` is registered once as a public page and renders
`AccessibilityStatementPage` in both BrowserRouter and HashRouter builds. The
duplicate `AccessibilityPage` was removed, the statement was re-reviewed
against `docs/accessibility/audit.md` (its known limitations and feedback
route still match), and the route is included in the Playwright axe scan. A
Layout test now checks that the footer link resolves to a registered route.
