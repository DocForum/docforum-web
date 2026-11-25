Phase W6: admin operations overview replaces the payments console at `/admin`
([issue #68](https://github.com/DocForum/docforum-web/issues/68)). The landing
page now shows one card per queue with count, oldest-item age and a drill-down
link, mutes sections the backend reports as unavailable, refreshes every minute
while visible, and keeps every console reachable when the aggregated endpoint
is not served. The payments console moved unchanged to `/admin/payments/console`.
Assumed shape pending docforum-core#123.
