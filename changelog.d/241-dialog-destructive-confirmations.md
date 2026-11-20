Accessibility: destructive confirmations use the shared `Dialog`
([issue #241](https://github.com/DocForum/docforum-web/issues/241)).
Revoking an API key, deleting a webhook endpoint and leaving dirty facility
settings now open a translated `Dialog` that names the affected key prefix
or endpoint URL and states the consequence, with a `danger` confirm button.
`window.confirm` is gone from all three flows. Focus returns to the next
row's action — or the list heading when the list is now empty — after a
destructive confirm, and a double-click on confirm can only send one
request. The facility settings guard still uses the browser's own
`beforeunload` prompt for a full page unload, because that UI belongs to
the browser. `Integrations.test.tsx` drives the dialog instead of stubbing
`window.confirm`, including Escape/focus restoration and the double-click
case; `Layout.test.tsx` covers the badge for 0, n and 99+.
