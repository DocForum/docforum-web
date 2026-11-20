Adopt shared loading, error, and empty states across patient and admin screens ([issue #106](https://github.com/DocForum/docforum-web/issues/106)).
`PatientOrdersList`, `PatientOrderDetail`, `MedicationSchedule`, `PaymentHistoryPage`, `PaymentDetailPage`, `AccessLogPage`, `AppointmentDetailPage`, `VerificationsQueue`, and `SpecialtyClaimsConsole` now use `Skeleton`, `QueryState`, `PageError`/`InlineError` with retry, and `EmptyState` with next-step navigation, replacing bespoke loading text and bare error blocks while preserving cold-start hints and screen copy.

