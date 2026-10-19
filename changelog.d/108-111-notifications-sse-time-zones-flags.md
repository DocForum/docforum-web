Phase W7: notification preferences, real-time updates, time zones and
evaluated feature flags
([issue #108](https://github.com/DocForum/docforum-web/issues/108),
[#109](https://github.com/DocForum/docforum-web/issues/109),
[#110](https://github.com/DocForum/docforum-web/issues/110),
[#111](https://github.com/DocForum/docforum-web/issues/111)).
Notification preferences with role defaults, locked safety-critical rows and
zone-aware quiet hours; a shared fetch-based SSE client with typed events,
backoff, auth refresh, hidden-tab pause and React Query invalidation;
app-wide IANA time-zone formatting with a persisted preference and dual-zone
care-timeline display; and a typed evaluated-flag client gating the
notification settings route/nav and realtime updates. API shapes for
`/notifications/preferences`, `/events` and `/me/flags` are assumed pending
docforum-core#99, #97 and #132, documented in `ARCHITECTURE_ESSENTIALS.md`
"Known assumptions — Phase W7". The issue's booking-screen dual-zone
requirement is not wired because this repo has no booking/appointment screens
yet.
