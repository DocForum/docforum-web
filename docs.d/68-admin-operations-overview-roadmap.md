---
file: ROADMAP.md
section: Phase W6 — Admin console
---
- [x] Admin operations overview dashboard. Tracked as [issue #68](https://github.com/DocForum/docforum-web/issues/68) (High, 200 pts) — `/admin` is now a "what needs attention" board (`src/features/admin-overview/`): one card per queue (verifications, stuck referrals, unrouted orders, stuck payments, failed jobs, disputes) with the count, the age of the oldest item and a drill-down link. A section the backend reports as unavailable renders muted with its reason, never an error page; the whole endpoint missing (`404`/`501`) keeps the individual console links and says so. Refreshes every minute while the tab is visible and catches up on focus. The payments console moved unchanged to `/admin/payments/console`, and audit/dispute links that used `/admin?intent=` were updated. **Built against assumed shape:** docforum-core#123 hasn't landed — see `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
