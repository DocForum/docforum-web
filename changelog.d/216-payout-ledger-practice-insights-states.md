Payments and insights screens no longer substitute invented figures when
the API is slow, missing or empty. `useFacilityLedger` and
`PracticeInsightsView` drop their built-in mock datasets; the shared
`QueryState`/`Skeleton`/`EmptyState` components now render a skeleton while
loading, a retryable error on failure, and an honest empty state — never a
zero that only means "still loading". The ledger uses an infinite query so a
failed "load more" keeps the pages already on screen.

Fixtures moved to `src/test/factories.ts`; regression tests cover loading,
error, empty and next-page failure for both screens.

Closes [#216](https://github.com/DocForum/docforum-web/issues/216).
