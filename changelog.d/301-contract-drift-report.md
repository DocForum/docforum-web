Phase W7: `npm run check:contract-drift` lists every `apiFetch`-family call in
`src/services` and the package client against docforum-core's endpoint docs,
marked documented, assumed or drifted ([issue #301](https://github.com/DocForum/docforum-web/issues/301)).
It reads a local core checkout or fetches the pinned ref, runs warn-only in CI,
and reports 11 assumed / 120 drifted calls today so the drift is visible.
