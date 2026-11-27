---
file: ARCHITECTURE_ESSENTIALS.md
section: Hard rules
---
### Shared date and time formatting (issues #254 and #255)

Application date/time display must use `src/i18n/` formatters or `ZonedTime`.
Pure formatting functions receive locale and time-zone context explicitly.
Date-only values must remain calendar dates and must not be converted through an
instant/time-zone shift. Facility-specific instants prefer a valid facility
time zone, then fall back to the user's configured time zone; the browser zone
is used only as the existing last-resort preference, never silently replacing
an explicit invalid or unavailable facility setting.
