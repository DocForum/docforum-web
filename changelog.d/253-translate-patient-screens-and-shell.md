Phase W7: notifications, search, care timeline/hub, health profile, medications
and the app shell now render all UI copy through the i18n catalogues
([issue #253](https://github.com/DocForum/docforum-web/issues/253)). Counts and
API status/kind values use ICU messages; symptom vocabulary and weekday/month
names stay as data/Intl output. Each feature has a test that renders under Español.

Completing the catalogues grows `en.json` from 434 to 1372 message ids, and the
English chunk is fetched at boot, which adds ~17 kB gzip to the page's script
total. The Lighthouse `resource-summary:script:size` ceiling moves from 450 kB
to 480 kB to cover the bilingual message data; the gzip first-load and lazy
chunk budgets in `performance-budget.json` are unchanged.
