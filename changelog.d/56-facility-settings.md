Phase W4: facility settings — location, opening details and price list
([issue #56](https://github.com/DocForum/docforum-web/issues/56)).

- `Location & contact` editor: street address, city, phone/email, OSM map with a click-to-move pin, always-visible latitude/longitude fields as the keyboard-accessible alternative to the map, and per-day opening hours (open/close times with a closed toggle). Required-field, coordinate-range, email-format and opening-time-ordering validation; save/discard with an unsaved-changes guard.
- `Price list` editor: catalog search (name or code), per-asset price entry (XLM/USDC), an effective-from timestamp, and a newest-first version history labelled current / scheduled / superseded. Decimal input is converted to BigInt-safe stroops client-side with per-asset decimal limits (7), rejecting over-precise, negative, zero and non-numeric amounts before any request. A prominent notice states that existing PaymentIntents keep their snapshotted amount, so price changes never reprice an existing payment.
- Unsaved-changes guard works with `HashRouter` (capture-phase anchor interception + `beforeunload`) since it isn't a data router.
- New `facility-settings` service/hooks/feature, `/facility/settings` route (facility-role-gated), Settings links in the header nav and every facility page tab bar, and mock handlers/fixtures for settings, catalog and price history. API shapes are assumed pending `docforum-core#74`/`#127`, recorded in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
- Desktop and mobile screenshots in `screenshots/`.
- After merging `main`, de-duplicated the `fac-main` price seed so each catalog item's version history loads once, and refreshed the facility-dashboard visual baselines in the CI Playwright image for the new Settings tab.
