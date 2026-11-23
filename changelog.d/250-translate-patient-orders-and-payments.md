### Patient orders and payments in Spanish (#250)

Patient orders and payment screens (`src/features/orders/`, `src/features/payments/`)
now read all copy through `useT`: headings, empty and error states, buttons,
placeholders, accessibility labels, fulfilment statuses and every payment
status. Counts and statuses use ICU plurals/selects in the catalogue, and the
Spanish catalogue (`src/i18n/messages/es.json`) carries the translations.
Clinical data — medication and test names, doses, quantities and instructions
— plus facility names are never translated, and raw API status ids never reach
the page. Tests render each screen with the Spanish catalogue and assert both
the translated chrome and the untouched clinical fields
(`*.es.test.tsx`). The API contract is unchanged.
