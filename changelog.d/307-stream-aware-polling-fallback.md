Phase W7: stop unconditional 30-second polling while the event stream is live
([issue #307](https://github.com/DocForum/docforum-web/issues/307)).
`useRealtimeLive()` combines the `realtime_updates` flag with the stream's
`open` state. Queue and running-delay queries stop polling while live and fall
back to 30 s otherwise. docforum-core emits no results SSE event, so the
abnormal-results inbox keeps a documented 60 s safety poll instead of going
stale; a reconnect invalidates queue, running-delay, appointment and results
queries once. The queue event now invalidates the real query-key factory keys.
