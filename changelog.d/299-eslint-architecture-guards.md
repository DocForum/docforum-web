Phase W7: ESLint now enforces three architecture rules that were review-only
([issue #299](https://github.com/DocForum/docforum-web/issues/299)). Raw
`fetch` is limited to `src/services/api-client.ts`,
`event-stream-service.ts`, `src/utils/analytics.ts` and the package client;
browser storage is limited to the time-zone preference; `MOCK_*` fixtures are
limited to `src/mocks/` and tests. Existing violations carry file-level
disables pointing at the issue, and `check:dist` also looks for fixture
markers in the production bundle.
