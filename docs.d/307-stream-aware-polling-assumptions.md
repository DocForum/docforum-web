---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions > Phase W7 — Notification preferences, SSE, time zones and evaluated flags
---
### Polling fallback while the stream is live (issue #307)

`GET /events` and `queue.updated` remain frontend assumptions: docforum-core
currently exposes only `GET /notifications/stream` and emits no queue or
results events. Queue and running-delay polling stop only while
`realtime_updates` is on and the manager reports `open`; any other state keeps
the 30 s fallback. Core has no results SSE event, so the abnormal-results
inbox keeps a 60 s safety poll while live rather than going stale forever.
A `not-live → live` transition invalidates the queue, running-delay,
appointment and pending-results queries once to cover events missed during a
reconnect.
