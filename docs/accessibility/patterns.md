# Accessible patterns

Use these patterns for new screens. They are the ones the audit
(`docs/accessibility/audit.md`) fixed and tests cover.

## Dialog / modal

Use `src/components/Dialog.tsx` — never hand-roll `role="dialog"`.

```tsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  labelledBy="invite-title"
  describedBy="invite-description"
  overlayClassName={styles.modalOverlay}
  panelClassName={styles.modalContent}
>
  <h3 id="invite-title">Invite team member</h3>
  <p id="invite-description">…</p>
</Dialog>
```

`Dialog` provides:

- `role="dialog"` + `aria-modal="true"` and a name from `labelledBy`
  (always a visible heading).
- Initial focus on the first focusable element (or the panel).
- Tab/Shift+Tab wrap inside the dialog.
- Escape closes it.
- Focus returns to the element that opened it.
- Backdrop press closes, but only when the press starts on the backdrop.

Rules:

- Never nest dialogs.
- Keep one primary action; destructive actions use `Button variant="danger"`.
- Error text goes in `FormError` (`role="alert"`); if a field has an error,
  pass it to `TextField` so `aria-describedby`/`aria-invalid` are wired.
- Tests: open from a trigger, assert focus inside, press Escape, assert
  focus is back on the trigger. See `FacilityTeam.a11y.test.tsx`.

## Data tables

Clinical and queue tables are real `<table>` elements — never grids of
divs with ARIA roles.

```tsx
<table>
  <caption className="srOnly">Today's checked-in patients in queue order</caption>
  <thead>
    <tr>
      <th scope="col">Patient</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Ada Patient</th>
      <td>Checked in</td>
    </tr>
  </tbody>
</table>
```

- Always a `<caption>` (visually hidden is fine) describing the data.
- `scope="col"` on column headers, `scope="row"` on the row identifier.
- Put the table in a wrapper with `overflow-x: auto` for narrow screens;
  do not remove headers to save space.
- If a chart is offered, it must have a `<table>` alternative (see
  `UtilisationChart.tsx`). The chart gets one accessible name; its bars are
  not focusable.
- Do not make a non-interactive card `tabIndex={0}`. Put the real action in
  a button inside it and label the card with a heading (`<article>`).

## Calendar and date ranges

- Appointment timestamps always go through `useFormat()` and
  `formatAppointmentTime()` / `formatDateTime()` so they include an
  explicit time zone.
- Month names are used for day+month dates. Never render `03/04`.
- Date inputs are native `<input type="date">` inside a
  `<fieldset><legend>`. Give each input exactly one `<label>` (a visually
  hidden one is fine); do not also add `aria-label` — duplicated names are
  inconsistent across screen readers.
- When a range is applied, announce the result in a polite live region
  ("Custom range applied: 1 Mar 2026 to 31 Mar 2026") *after* the update,
  not while typing.
- Targeted-date pickers (week grids) should use a real table/`grid` with
  row and column headers, not a `<div>` maze. The insights range selector
  also works as a simple preset group, which this app uses today.

## Live regions and queue updates

Use `src/hooks/useAnnouncer.ts` + `src/components/LiveRegion.tsx`.

- Keep one permanently mounted `role="status" aria-live="polite"` region
  per surface. Do not mount/unmount it with the message.
- Batch rapid changes: queue polls can change several rows at once. The
  hook merges messages inside an 800ms window and drops duplicates.
- Summarise with counts, not a stream of names:
  "Queue updated. 4 patients in the queue: 2 waiting, 1 in progress, 1
  completed."
- Announce the result of an explicit action separately
  ("Starting visit for Ada Patient. Undo is available for 4 seconds.").
- Reserve `role="alert"` / `assertive` for errors that block the user.
- Never announce on every render, and never announce a refetch that
  produced identical data.
- Tests: `useAnnouncer.test.tsx`; assert the region exists and receives one
  merged message.

## Forms

- Every control has a visible `<label>` (use `TextField`, or a native
  label for selects/radios).
- `TextField` supports `hint` and `error`; both are concatenated into
  `aria-describedby`, and `aria-invalid` reflects the error.
- On a failed submit, move focus to the first `[aria-invalid="true"]`
  control. Do not rely on the alert alone.
- Announce pending work with a polite status ("Logging in. Please wait."),
  plus the existing slow-request hint for cold starts.
- Radio groups use `<div role="radiogroup" aria-label>` (or a fieldset) and
  wrap each input in its label.

## Focus, navigation and targets

- Global `:focus-visible` ring: 2px `--color-focus-ring`, 2px offset.
  Do not set `outline: none` on inputs.
- The shell has a "Skip to main content" link and `<main id="main-content"
  tabIndex={-1}>`. Route changes focus `main` (except first paint).
- Use `aria-current="page"` for the active nav item/tab.
- Buttons and inputs are at least `--target-size` (44px); native radios
  and checkboxes are at least 24px. Small table buttons still inherit the
  Button minimum height.
- Disabled state is opacity + `disabled`, with the reason available in
  text (`title` or adjacent copy — a `title` alone is not enough).

## Motion and colour

- Any GSAP/CSS animation must check `prefers-reduced-motion`; global CSS
  clamps transitions. Functional spinners may keep a slower animation but
  must not convey information by motion alone.
- Use tokens, not hardcoded hex values. Foreground-on-accent combinations
  use `--color-accent-contrast`, `--color-accent-2-contrast` or
  `--color-danger-contrast`; these flip for dark mode.
- Text must reach 4.5:1 (3:1 for large text). The current token pairs are
  listed in `audit.md`.

## RTL

- Style with logical properties: `margin-inline-*`, `padding-inline-*`,
  `inset-inline-*`, `border-inline-*`, `text-align: start|end`.
- `LocaleSync` sets `<html lang>` and `<html dir>` from the locale store.
- Geographic overlays (map marker positions) keep physical `left/top`
  because they encode coordinates, not reading order.
- Verify with the footer locale switch (`ar-EG`) and check tables, dialogs,
  timeline connectors and form controls.
