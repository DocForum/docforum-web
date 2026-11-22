Phase W7: behaviour tests for six untested patient and doctor views
([issue #297](https://github.com/DocForum/docforum-web/issues/297)).
`CareCardList`, `PatientChartPanel`, `AbnormalResultsInbox`,
`CalendarSubscriptionSection`, `PaymentHistoryList` and `PaymentReceipt` now
have loading/empty/error coverage and their key interactions, driven through
the shared MSW server and `renderWithProviders`, with `jest-axe` checks. The
calendar feed input's label is now actually associated with its input, which
the new accessibility assertion caught.
