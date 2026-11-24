# [Phase W4] Facility settings: location, opening details and price list

Closes #56

---

## Summary

This PR implements **issue #56 — [Phase W4] Facility settings: location, opening details
and price list**. It gives facility owners and staff a single, dedicated **Facility
settings** screen (`/facility/settings`) where they can:

1. **Maintain the facility's location, contact details and opening hours** — including a
   map pin they can place, and
2. **Edit the facility's price list** — per catalog item and per payment asset, with a
   full effective-from version history.

The screen is role-gated to the `facility` role, added to the header navigation, and
cross-linked from every existing facility page tab bar so it is discoverable from the
fulfillment queue, order verification, team management and payouts screens.

This implements the facility management flow described in the PRD §4 facility core flows
(Phase W4).

---

## Description

### Background

Facilities were already able to manage staff (#51), verify orders (#52) and view their
payout ledger (#53), but they had **no way to self-serve the data that patients and the
platform depend on most**:

- The **address and coordinates** that drive distance-sorted facility search.
- The **opening hours** patients use to decide whether a facility is available.
- The **contact details** patients need to reach the facility.
- The **prices** that will be used to create future payment intents.

Without this screen, every one of those changes required a manual backend/database
change, which is unscalable and error-prone. #56 closes that gap.

### What was built

#### 1. Location & contact editor

`src/features/facility-settings/components/LocationContactEditor.tsx`

- **Street address, city, contact phone, contact email** — email is optional but
  format-validated when present.
- **Map pin placement** — an OpenStreetMap tile preview
  (`LocationMapPicker.tsx`) where clicking anywhere moves the facility pin. Coordinates
  update live in the latitude/longitude fields.
- **Keyboard-accessible alternative to the map (edge case from the issue)** — the
  latitude and longitude fields are always visible and fully editable by keyboard and
  screen reader. The map is explicitly a *convenience* for pointer users; the accessible
  region's `aria-label` tells assistive-tech users to use the coordinate fields instead.
  This was called out in the issue as a requirement and is covered by a test.
- **Opening hours** — a per-day table (Monday–Sunday), each day with an opens/closes
  time and a "closed" toggle. Closed days disable their time inputs.
- **Validation**:
  - Required: street address, city, contact phone.
  - Optional email must look like an email.
  - Latitude must be −90…90, longitude −180…180.
  - Working days must have both an opening and closing time, and closing must be after
    opening.
- **Save / Discard** — saving sends the editable subset via `PATCH`; discarding restores
  the last-saved values.
- **Unsaved-changes badge** and a **success/error banner**.

#### 2. Price list editor

`src/features/facility-settings/components/PriceListEditor.tsx`

- **Catalog search** — searches `docforum-core`'s catalog by item name *or* code.
- **Per-asset pricing** — each price targets one asset (`XLM` or `USDC`).
- **Effective-from timestamp** — a `datetime-local` field so a price can be scheduled to
  take effect at a specific moment.
- **Version history** — a newest-first table of every version, each labelled:
  - **Current** — the version in force right now,
  - **Scheduled** — a future version that will apply later,
  - **Superseded** — an earlier version that has been replaced.
- **Decimal-aware amount entry (reviewer focus)**:
  - Amounts are entered as **human decimals** and converted to **raw stroops** using
    `BigInt` — never floating-point math — so a large amount can never drift by a stroop.
  - Both assets settle to **7 decimal places** (`ASSET_DECIMALS`); the input is rejected
    client-side (with a clear message) if it has more than 7 decimals, is negative, is
    zero, or is non-numeric. This happens **before any network request**.
  - The stored/sent value is always a raw integer stroop string
    (1 XLM/USDC = 10,000,000 stroops).
- **Existing payments are never repriced (edge case from the issue)** — a prominent,
  always-visible notice on the price list states that saving a price creates a **new
  version for future orders only**, and that **payment intents that already exist keep
  the amount snapshotted when they were created**. There is no UI path in this screen
  that can mutate an existing payment intent.

#### 3. Unsaved-changes guard

`src/features/facility-settings/hooks/useUnsavedChangesGuard.ts`

The app uses `HashRouter`, which is **not** a data router, so `useBlocker` /
`unstable_usePrompt` are unavailable. The guard therefore:

- warns on a full page unload via `beforeunload`, and
- intercepts **in-app link navigation** with a capture-phase `click` listener on
  `document`, confirming with the user before letting the router navigate away.

The guard is active while **either** editor has unsaved changes, so the two editors are
combined via the `FacilitySettingsView` wrapper.

#### 4. Wiring

- New route `/facility/settings` in `src/App.tsx`, gated to the `facility` role.
- **Settings** links added to the header nav (`Layout.tsx`) and to the tab bar rendered on
  every facility page (`FacilityDashboardPage`, `OrderVerifyPage`, `FacilityTeamPage`,
  `FacilityPaymentsPage`, `FacilitySettingsPage`).
- New `FacilitySettingsPage` (page shell + tab bar) and `FacilitySettingsView` (loads
  settings, combines dirty state from both editors, mounts the guard).

---

## Assumed API contract (dependency not yet landed)

This feature depends on two `docforum-core` issues that have **not landed yet**:

- `DocForum/docforum-core#74` — facility location / distance-sorted selection.
- `DocForum/docforum-core#127` — facility price lists used to price PaymentIntents.

Because of that, the endpoint shapes below are **assumed** and mirrored in
`src/types/models.ts`. They are recorded in `ARCHITECTURE_ESSENTIALS.md` under "Known
assumptions" so they can be reconciled once the backend lands. **No deviation will be
silent** — this section is the contract to check.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/facilities/:facilityId/settings` | — | `FacilitySettings` |
| `PATCH` | `/facilities/:facilityId/settings` | `FacilitySettingsInput` | `FacilitySettings` |
| `GET` | `/catalog/items?query=` | — | `CatalogItem[]` |
| `GET` | `/facilities/:facilityId/prices` | — | `FacilityPrice[]` |
| `POST` | `/facilities/:facilityId/prices` | `FacilityPriceInput` | `FacilityPrice` |

- `FacilitySettings = { facilityId, name, type, address, city, latitude, longitude, phone, email, openingHours, updatedAt }`.
- `FacilitySettingsInput = { address, city, latitude, longitude, phone, email, openingHours }`.
- `openingHours` is always all seven `Weekday` entries (`monday`…`sunday`), each
  `{ day, closed, opensAt, closesAt }` with `HH:MM` local strings or `null` when closed.
- `CatalogItem = { code, name, type, description? }` where `code` is the stable id stored
  on a price.
- `FacilityPrice = { id, facilityId, catalogItemCode, catalogItemName, asset, amountStroops, effectiveFrom, createdAt }`.
- `FacilityPriceInput = { catalogItemCode, asset, amountStroops, effectiveFrom }`.

All calls go through `docforum-core`'s API via `apiFetch` — **no direct Stellar/escrow
calls** are made from this repo (architecture hard rule 1).

### Important note for the maintainer

If `docforum-core#74` / `#127` land with different shapes, the single places to change
are:

- `src/types/models.ts` (the type definitions), and
- `src/services/facility-settings-service.ts` (the request/response mapping).

The components consume those through React Query hooks only, so a shape change should be
a contained update.

---

## Acceptance checklist

- [x] Dedicated **Facility settings** page (`/facility/settings`), role-gated to `facility`.
- [x] Location editor: address, city, contact details.
- [x] Map pin placement updating `latitude` / `longitude`.
- [x] **Keyboard-accessible alternative** to the map (manual latitude/longitude fields).
- [x] Opening hours per day, with a closed toggle.
- [x] Price list editor: catalog search by name or code.
- [x] Set a price per asset (`XLM` / `USDC`).
- [x] Effective-from history, labelled current / scheduled / superseded.
- [x] **Decimal validation per asset** (7 decimals, no floats, client-side, before request).
- [x] Required-field validation (address, city, phone, coordinates, opening times).
- [x] **Unsaved-changes guard** covering both editors.
- [x] **Price changes never affect existing payment intents**, and the UI says so.
- [x] Tests for both editors.
- [x] Settings discoverable from the header nav and every facility page.
- [x] Mock fixtures/handlers with a multi-version price history.
- [x] `ROADMAP.md` and `ARCHITECTURE_ESSENTIALS.md` updated (per repo rules).
- [x] Desktop + mobile screenshots captured.

---

## Tests

New tests:

- `src/features/facility-settings/validation.test.ts` — decimal→stroop conversion
  (including exact 7-decimal and rejection cases), settings validation, opening-hours
  ordering, effective-from parsing.
- `src/features/facility-settings/components/FacilitySettings.test.tsx` — location/contact
  editor render + validation + save + discard + dirty state; price list history/statuses,
  catalog search, exact-stroop save, over-precision rejection, empty effective-from.
- `src/features/facility-settings/hooks/useUnsavedChangesGuard.test.tsx` — prompts before
  leaving a dirty editor, stays silent when clean.
- `src/mocks/handlers.test.ts` — added handler coverage for settings GET/PATCH (including
  400 on bad coordinates / missing fields), catalog search, and price list
  GET/POST (including 400 on non-stroop amounts and unknown catalog codes).

### Results

```
npm run typecheck   # clean
npm test            # 43 files, 396/396 tests passing
npm run build       # green  (tsc -b && vite build)
npm run check:dist  # green  (no mock code in production bundle)
```

---

## Screenshots

Captured with Playwright against the mock dev server, desktop (1440×1000) and mobile
(390×844):

- `screenshots/facility-settings-desktop.png` / `-mobile.png` — location & contact editor
  incl. map picker and opening hours.
- `screenshots/facility-settings-price-list-desktop.png` / `-mobile.png` — price list with
  version history and statuses.
- `screenshots/facility-settings-price-validation-desktop.png` / `-mobile.png` — the
  over-precision decimal validation message.

---

## Screens changed / PRD flows

- **New screen:** Facility Settings (`/facility/settings`) — implements the PRD §4 facility
  management flow (Phase W4, `docforum-core`).
- **Touched screens:** added a Settings tab link to the facility fulfillment queue, order
  verification, team management and payouts pages (navigation only, no behaviour change).

---

## Follow-ups / notes for maintainers

- Reconcile the assumed endpoint shapes when `docforum-core#74` and `#127` land
  (see "Assumed API contract" above).
- Server-side validation of coordinates, assets and stroop amounts is presumed but not
  implemented here (this repo never talks to the backend directly for writes beyond the
  documented API); the client validation is a UX guard, not a security boundary.
- Money remains BigInt-safe throughout; no floating-point currency math is introduced.

🤖 Generated with the repo's standard agent workflow. No co-author trailer, per maintainer
direction.
