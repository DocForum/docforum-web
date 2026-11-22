---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions (issue #107) — notification centre
---
### New-notification announcements and quiet hours (issue #246)

The bell announces increases in the server's `unreadCount`. It assumes quiet
hours (#108) are applied by docforum-core when a notification is delivered, as
the quiet-hours setting describes ("Pause non-urgent email, SMS and in-app
notifications"). A notification that reaches the in-app inbox was meant to be
seen now, so the client announces it and does not apply quiet hours a second
time. Doing so would also mute the safety-critical results and security alerts
that must get through. The preference model has no separate setting to silence
in-app screen-reader announcements. If one is added, the hook should read it.
Announcements contain only counts, never notification titles or bodies.
