Phase W7: doctor availability, referrals, results, today's appointments, patient
chart and verification screens now render all UI copy through the i18n catalogues
([issue #252](https://github.com/DocForum/docforum-web/issues/252)). Counts and
API status values use ICU messages; weekday and month names still come from Intl,
now with the app locale. Each feature has a test that renders under Español.
