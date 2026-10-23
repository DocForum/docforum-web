Phase W7: PR preview builds, shared test utilities + coverage gate,
consistent loading/empty/error states, and the notification centre
([issue #104](https://github.com/DocForum/docforum-web/issues/104),
[#105](https://github.com/DocForum/docforum-web/issues/105),
[#106](https://github.com/DocForum/docforum-web/issues/106),
[#107](https://github.com/DocForum/docforum-web/issues/107)).

Every PR now gets a mock-API preview build, attached to the PR as a
downloadable artifact and commented by `pr-preview-comment.yml`; nothing is
published to GitHub Pages or any other shared origin. The build runs
unprivileged on `pull_request`, and the comment job resolves fork PRs from the
run's head SHA/branch, so fork code never sees a write token or a secret.
Artifacts are private and expire after 14 days, and previews are built against
a reserved-invalid API URL checked by `npm run check:preview` — they can never
reach the real backend.

Tests now share `renderWithProviders`, typed factories and one MSW server, and
CI enforces v8 coverage thresholds on `src/features/` and `src/services/`
(`npm run test:coverage`). `src/components/states/` provides `Skeleton`,
`EmptyState`, `InlineError`, `PageError` and `QueryState`, applied across the
query-driven views; the notification bell and `/notifications` inbox add
cursor pagination, per-kind deep links (generic fallback for unknown kinds),
mark-one/mark-all read, SSE via a single-use stream ticket and cross-tab badge
consistency.

The notification API is assumed until docforum-core#93 lands — see
`ARCHITECTURE_ESSENTIALS.md` → "Known assumptions (issue #107)". Preview
artifacts need no repository settings or secrets; see `CONTRIBUTING.md` →
"Preview builds".
