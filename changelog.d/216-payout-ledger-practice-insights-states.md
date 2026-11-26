Practice insights no longer substitute invented figures when the API is
slow, failing or empty. `PracticeInsightsView` drops its built-in mock
dataset and uses the shared `QueryState`/`Skeleton`/`EmptyState`
components: a skeleton while loading, a retryable error on failure, and an
honest empty state for a range with no appointments. Test fixtures live in
`src/test/insights-fixtures.ts`; regression tests cover loading, error and
empty states.

Closes [#216](https://github.com/DocForum/docforum-web/issues/216).
