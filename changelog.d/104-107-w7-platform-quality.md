Phase W7: PR preview deployments, shared test utilities + coverage gate,
consistent loading/empty/error states, and the notification centre
([issue #104](https://github.com/DocForum/docforum-web/issues/104),
[#105](https://github.com/DocForum/docforum-web/issues/105),
[#106](https://github.com/DocForum/docforum-web/issues/106),
[#107](https://github.com/DocForum/docforum-web/issues/107)).

Every PR now gets a mock-API preview at
`/docforum-web/pr-preview/pr-<n>/`, commented on the PR and swept away once it
closes (an hourly run from `main` — never `pull_request_target`);
the build runs unprivileged on `pull_request` and only the artifact is
published from `workflow_run`, so fork code never sees a write token or a
secret. Previews are built against a reserved-invalid API URL and checked by
`npm run check:preview` — they can never reach the real backend.

Tests now share `renderWithProviders`, typed factories and one MSW server, and
CI enforces v8 coverage thresholds on `src/features/` and `src/services/`
(`npm run test:coverage`). `src/components/states/` provides `Skeleton`,
`EmptyState`, `InlineError`, `PageError` and `QueryState`, applied across the
query-driven views; the notification bell and `/notifications` inbox add
cursor pagination, per-kind deep links (generic fallback for unknown kinds),
mark-one/mark-all read, SSE via a single-use stream ticket and cross-tab badge
consistency.

The notification API is assumed until docforum-core#93 lands — see
`ARCHITECTURE_ESSENTIALS.md` → "Known assumptions (issue #107)". Enabling the
previews needs the one-time Pages source switch documented in
`CONTRIBUTING.md` → "Preview deployments".
