Phase W6: admin operations overview dashboard
([issue #68](https://github.com/DocForum/docforum-web/issues/68)). `/admin`
is now a "what needs attention" board — one card per queue with its count,
the oldest item's age and a drill-down to that console — auto-refreshing
every 60 seconds while the tab is visible, with unavailable sections
rendered as muted cards (and a whole-endpoint 404 as a muted notice) rather
than errors. The payments console moved to `/admin/payments/console`
unchanged; its `?intent=<id>` deep link followed it, so the audit trail and
dispute detail links now open the console directly. Built against the
assumed `GET /admin/overview` contract pending docforum-core#123; admin nav
gained an Overview entry and each admin page's back link now reads "Back to
admin overview".
