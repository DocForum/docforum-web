---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W6 — Admin operations overview (issue #68, assumed docforum-core#123)

- `GET /admin/overview` (admin) → `OperationsOverview` = `{generatedAt, queues: OverviewQueue[]}`.
- `OverviewQueue` = `{key, label, count, oldestAt, href, available, detail?}`. `key` is `verifications | stuck_referrals | unrouted_orders | stuck_payments | failed_jobs | disputes`; `oldestAt` is the oldest waiting item (null when the queue is empty); `href` is an in-app drill-down path.
- `available: false` means the backend could not report that section (source down, or not implemented). The board renders it muted with `detail` and still links to the console — a partial outage must not turn the landing page into an error.

The client never totals queues from other endpoints; counts and ages are the backend's. Polling is 60 s with `refetchIntervalInBackground: false`, so a hidden tab stops polling and refetches on focus. A whole-response `404`/`501` is shown as "not available on this deployment yet" with links to every console, which is the state the live API is in until docforum-core#123 lands. The payments console lives at `/admin/payments/console` since #68; `/admin?intent=<id>` became `/admin/payments/console?intent=<id>`.
