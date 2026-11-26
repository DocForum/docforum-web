---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Stop 30-second polling while the SSE stream is live. Tracked as [issue #307](https://github.com/DocForum/docforum-web/issues/307): `useRealtimeLive()` combines `realtime_updates` with the manager's `open` state; queue and running-delay queries stop polling while live and fall back to 30 s otherwise. Core emits no results event, so the abnormal-results inbox keeps a 60 s safety poll; reconnecting invalidates the queue, running-delay, appointment and results queries exactly once.
