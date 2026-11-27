Phase W6: the stuck referrals, system health and verification consoles are
translated ([issue #249](https://github.com/DocForum/docforum-web/issues/249)).
Every user-visible string in `src/features/admin-referrals/`,
`src/features/admin-system/` and `src/features/admin-verification/` now comes
from the catalogues — headings, buttons, empty and error states, dialog copy,
placeholders, `aria-label`s and status labels — with counts and statuses as
ICU plurals rather than concatenation. Pure helpers (`queue`, `claims`,
`status`, `errors`, `decision`, `reason`, `format`) take an optional
translator defaulting to the English ICU fallback, so non-React callers and
the existing tests are unchanged; nouns interpolated into a sentence are
translated too, never an English word dropped into a Spanish message.
`TimeAgo` now formats relative times with `Intl.RelativeTimeFormat` in the
active locale. Raw API tokens (claim and referral ids, and the referral
chain's hop statuses) are still shown as the server sent them; `npm run check:i18n` passes with full
Spanish coverage, and each feature has a Spanish render test.
