---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W7 — Platform quality (issues #116–#119)
---
#### Date and time inputs (issue #114)
- Use `DatePicker`/`TimePicker` (`src/components/`) for every date or time field; don't add `<input type="date|time|datetime-local">`. Values stay in the native formats (`YYYY-MM-DD`, 24-hour `HH:mm`), so services and validation are unchanged. A date-and-time field is one of each (see `PriceListEditor`).
- Like native inputs, a typed date/time outside `min`/`max` is still reported (and flagged `aria-invalid` on blur); the form's own validation decides and its `error` prop wins over the picker's message.
- "Today" and the zone hint come from an explicit IANA zone (`timeZone` prop, else the user's `TimeZoneProvider` zone). The pickers never convert a value between zones; date maths is calendar-day arithmetic in UTC (`src/utils/date-input.ts`), so DST cannot shift a day.
- They work without an `IntlProvider` (English defaults, `en` locale) via `useOptionalT`, so isolated component tests and stories need no wrapper.
