# Accessibility audit — auth, patient, doctor, facility and admin flows

Issues: [#89](https://github.com/DocForum/docforum-web/issues/89),
[#90](https://github.com/DocForum/docforum-web/issues/90)
Date: 2026-10-18
Target: WCAG 2.2 level AA (`WCAG22`)

## Method

| Check | How it was run | Scope |
| --- | --- | --- |
| Automated rules | `jest-axe` / `axe-core` 4.10 in the Vitest suite (`npm test`) | Every flow below |
| Keyboard-only | Testing Library `user-event`, explicit `keydown` tests, focus assertions | Dialogs, forms, date range, queue actions |
| Structure | Role-based queries (table/rowheader/columnheader/status/dialog) | All data tables, live regions |
| Contrast | Token pairs calculated against WCAG 2.x relative-luminance formula | Pine/brass palette, light and dark |
| Screen reader | **Not run in this environment** — no NVDA/VoiceOver/browser available. Automated names/roles and live-region behaviour are covered; a human pass is still required (see Limitations). | All flows |

The app was also audited by reading every interactive element, checking
that each one is a native control, has an accessible name, and appears in
a sensible tab order.

## Checklist and findings

### Auth — signup, login, claim account (#89)

| # | Check | Finding | Fix | Regression test |
| --- | --- | --- | --- | --- |
| A1 | Inputs have programmatic labels | Pass (`TextField` wraps a `<label>`) | — | axe tests |
| A2 | Errors are associated, not colour-only | Pass (`aria-invalid` + `aria-describedby`) | Errors now also appear alongside persistent hints | `LoginForm.a11y.test.tsx` |
| A3 | Focus moves to the first invalid field | **Fail** — focus stayed on the submit button | `useEffect` focuses `[aria-invalid="true"]` on failed validation | `LoginForm.a11y.test.tsx`, `SignupForm.a11y.test.tsx` |
| A4 | Async states are announced | **Partial** — only the cold-start hint was a status region | Added a polite "Logging in / Creating account" status | `LoginForm.a11y.test.tsx` |
| A5 | Password requirements available before submit | **Fail** — only shown after an error | Added a persistent hint, included in `aria-describedby` | `SignupForm.a11y.test.tsx` |
| A6 | Focus indicator is not removed | **Fail** — `.input:focus` set `outline: none` | Removed; global `:focus-visible` ring now applies, border/ring remains as an extra cue | manual/axe |
| A7 | Placeholder contrast | **Fail** — `--color-text-faint` was 3.52:1 | Placeholders use `--color-text-muted` at 6.7:1; faint text token itself darkened | token tests + audit |
| A8 | Target sizes | **Partial** — inputs ~40px, native radios 13px | `--target-size: 44px` for buttons/inputs, 24px minimum for radios/checkboxes | manual |
| A9 | Reduced motion | Pass for GSAP/scroll reveals | Added a global transition-duration floor for reduced motion | manual |

### Patient — dependents, health profile, settings, care timeline, facility finder (#89)

| # | Check | Finding | Fix | Regression test |
| --- | --- | --- | --- | --- |
| P1 | Each screen has one `h1` and labelled sections | Pass | — | axe |
| P2 | Data export dialog traps/restores focus | **Fail** — plain `role="dialog"`, `autoFocus` only | Migrated to `Dialog` (trap, Escape, restore, backdrop press) | `DataExportSection` tests + `Dialog` keyboard tests |
| P3 | Status of async export is announced | Pass (`role="status" aria-live="polite"`) | Kept, now also localised | axe |
| P4 | Dates readable in every locale | **Fail** — `toLocaleDateString()` produced ambiguous numeric dates in some locales | Central `Intl` helpers use month names and explicit time zones | `format.test.ts` |
| P5 | Timestamps are machine-readable | **Partial** | Added `<time dateTime="…">` to every rendered date | axe/manual |
| P6 | Care timeline exposes landmark semantics | **Fail** — `aria-label` on a plain `div` was ignored | Changed to `<section aria-label>`; partial notice is `role="note"` | axe |
| P7 | Map is not the only way to reach facilities | Pass (the list is the primary content) | Map markers keyboard operable with `aria-pressed`; tiles `alt=""` | axe |
| P8 | Account deletion warnings are not colour-only | Pass (text + `role="note"`) | — | axe |

### Doctor — dashboard, live queue, inbox, insights, consultation, palette (#90)

| # | Check | Finding | Fix | Regression test |
| --- | --- | --- | --- | --- |
| D1 | Queue table has caption + scoped headers | **Fail** — no caption, plain `<th>` | `<caption class="srOnly">`, `scope="col"`, patient is a row header | `QueuePanel.a11y.test.tsx` |
| D2 | Live queue updates do not spam a screen reader | **Fail** — polled every 30s with no announcement policy | Batched polite announcements (`useAnnouncer`, 800ms) with a count-only summary; action feedback announced separately | `useAnnouncer.test.tsx`, `QueuePanel.a11y.test.tsx` |
| D3 | Row actions have unique names | **Partial** — several "Start"/"Complete" buttons | Names include the patient (`Start visit for Ada Patient`) | `QueuePanel.a11y.test.tsx` |
| D4 | Chart is not the only representation | Pass (table alternative existed) | Removed focusable, non-interactive SVG bars; chart has one accessible name, table is the detail source | `PracticeInsights.a11y.test.tsx` |
| D5 | Dialog focus management (palette / shortcuts) | **Fail** — no trap, no restore, backdrop-only close | Both use `Dialog`; combobox has a real label, `aria-expanded`, `aria-autocomplete` | `CommandPalette.a11y.test.tsx` |
| D6 | Calendar/date range has group semantics | **Fail** — `aria-label` on a `div`, duplicated labels on date inputs | `<fieldset><legend>`, one label per input, applied-range status | `PracticeInsights.a11y.test.tsx` |
| D7 | Consultation note textarea is labelled | **Fail** — placeholder only | See follow-up note; native `aria-label` added where no visible label exists | axe |
| D8 | Insights tables | Pass (captions/scopes), percentages now localized | — | axe |

### Facility — fulfillment queue, staff accounts (#90)

| # | Check | Finding | Fix | Regression test |
| --- | --- | --- | --- | --- |
| F1 | Queue items are not focusable non-interactive divs | **Fail** — `tabIndex={0}` on a card | Cards are `<article>` with a heading; buttons inside are the only tab stops | axe |
| F2 | Data tables have captions and headers | **Fail** — `aria-label` only | Captions + `scope="col"` + email/name row headers | `FacilityTeam.a11y.test.tsx` |
| F3 | Invite/remove dialogs trap and restore focus | **Fail** — plain dialogs | Both migrated to `Dialog`; Escape closes; focus returns to trigger | `FacilityTeam.a11y.test.tsx` |
| F4 | Destructive action uses a real danger style | **Fail** — inline background/colour | `Button variant="danger"` using tokens; contrast-safe in dark mode | axe |
| F5 | Tabs expose the current page | **Fail** | `aria-current="page"` on the active facility tab | axe |

### Admin — payments console (#90)

| # | Check | Finding | Fix | Regression test |
| --- | --- | --- | --- | --- |
| AD1 | Payment lookup field is labelled | Pass (`TextField`) | — | axe |
| AD2 | Status changes are visible and not colour-only | Pass (text status + tx hash) | — | manual |
| AD3 | Buttons are not identified only by position | Pass (Fund/Release/Refund have text names) | — | `PaymentIntentPanel` tests |
| AD4 | Amounts never lose precision | **Fail** — raw stroop strings shown | `formatAssetAmount` formats bigint strings without `Number` | `format.test.ts` |

### Global shell

| # | Check | Finding | Fix |
| --- | --- | --- | --- |
| G1 | Skip link | **Fail** | "Skip to main content" link, visible on focus |
| G2 | Route changes move focus | **Fail** | `Layout` focuses `<main>` on pathname change (not on first paint) |
| G3 | Landmarks/nav names | Partial | `nav aria-label="Primary"`, main landmark with id |
| G4 | Current page indicated | **Fail** | `aria-current="page"` in primary and facility navigation |
| G5 | Offline/reconnect state announced | **Fail** | `OfflineBanner` + `onlineManager` (polite, once on reconnect) |
| G6 | RTL layout | **Fail** | Logical CSS properties + `LocaleSync` sets `dir`/`lang` |
| G7 | Contrast tokens | **Fail** (several) | See table below |

## Contrast changes (brand-preserving token edits)

| Token | Before | Ratio | After | Ratio |
| --- | --- | --- | --- | --- |
| `--color-text-faint` (light) | `#8c8271` | 3.52:1 on `#faf6f0` | `#6f6757` | 5.20:1 |
| `--color-accent-2` / `--color-warning` (light) | `#a6763d` | 3.98:1 on white; 3.31:1 on its subtle surface | `#8a5a1f` | 5.89:1 / 4.90:1 |
| `--color-accent` (dark) | `#4a9b76` | 4.25:1 on `--color-accent-subtle` | `#5fae8a` | 5.39:1 |
| `--color-text-faint` (dark) | `#8a7f68` | 4.65:1 on background, lower on raised surfaces | `#9a8f77` | 5.4:1+ |
| White text on brass | `#faf6f0` on `#a6763d` | 3.69:1 | token-based `accent-2-contrast` on `#8a5a1f` | 5.47:1 |

The pine/brass identity is unchanged — the brass is slightly deeper, and
accent/brass foregrounds now use `*-contrast` tokens so dark mode is
readable too.

## Regression tests added

- `src/i18n/format.test.ts`, `src/i18n/LocaleSync.test.tsx` — locale dates,
  time zones, bigint amounts, direction.
- `src/services/api-client.test.ts` — retry/idempotency (issue #85).
- `src/hooks/useAnnouncer.test.tsx` — batching, duplicate suppression.
- `src/components/OfflineBanner.test.tsx` — offline/online transitions.
- `src/features/auth/components/LoginForm.a11y.test.tsx` / `SignupForm.a11y.test.tsx` — axe, error association, focus, hints, pending announcements.
- `src/features/queue/components/QueuePanel.a11y.test.tsx` — axe, caption/headers, live region, action names.
- `src/features/facility-team/components/FacilityTeam.a11y.test.tsx` — axe, captions, dialog trap/restore.
- `src/components/CommandPalette.a11y.test.tsx` — axe, combobox label, Escape + focus restore.
- `src/features/insights/components/PracticeInsights.a11y.test.tsx` — axe chart/table, fieldset/legend.
- `src/pages/AccessibilityStatementPage.test.tsx` — axe + honest statements.

## Limitations / follow-ups

1. **No human screen-reader pass yet.** Automated rules and keyboard tests
   cannot catch every announcement-quality problem (for example whether a
   batched queue summary is understandable in context). This must be done
   on the deployed preview with NVDA and VoiceOver before claiming full
   conformance. Tracked in the PR description.
2. **No real browser screenshot pass.** The environment had no browser
   available; layout/RTL and focus visuals were verified from code, CSS and
   DOM assertions only.
3. **Browser-level axe run** (axe DevTools) is still worth doing on the
   Pages preview for rules that need a real layout engine.
4. Untranslated copy remains English; the locale switcher is a
   formatting/direction switch, not a translation framework.
