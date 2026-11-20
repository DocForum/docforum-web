Phase W2: compare facility prices for an order item, including price on request
([issue #258](https://github.com/DocForum/docforum-web/issues/258)). The facility
finder accepts the order item's catalog code (`/patient/facilities?catalogItemCode=…`)
and shows every eligible facility's current price, formatted from BigInt stroop
strings with the existing helpers (never through `Number`), or "Price on request".
A sort toggle switches between distance and price, with price-on-request
facilities always after priced ones and the chosen order announced to screen
readers. Each priced card lazily loads that facility's price history for a small
"price changed on …" note; only versions already in force count, so a
future-dated price is never shown as the current one. Orders that still need a
facility link to the finder with their item's code. The assumed API shapes are
recorded in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".
