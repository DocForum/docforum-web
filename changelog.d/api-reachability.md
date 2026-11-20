Phase W7 platform quality: early backend wake-up and API reachability tracking.
The app fires a non-blocking `GET /health/live` ping on boot to warm cold-started
Render instances before login submission. `OfflineBanner` now distinguishes
browser offline status from an unreachable/waking server, providing a dedicated
"Our server is waking up / unreachable" banner with a retry action and polite
live-region announcements when reconnected.

