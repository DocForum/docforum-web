Phase W7: doctor and facility screens now use the shared loading, error and
empty states from issue #106 instead of ad-hoc "Loading…" text and inline
error paragraphs ([issue #281](https://github.com/DocForum/docforum-web/issues/281)).
ReferralInbox, ReferralDetailPage, CredentialList, SpecialtyClaimPicker,
ApiKeysPanel, WebhooksPanel and DoctorAvailabilityPage render a `Skeleton`
while loading, a catalogue-derived `InlineError`/`PageError` with a retry when
a request fails, and an `EmptyState` with a next action. Failed background
refetches keep the loaded content on screen and are reported beside it.
