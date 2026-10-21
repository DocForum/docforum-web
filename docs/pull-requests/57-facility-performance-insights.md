# [Phase W4] Facility performance insights: turnaround times and rejection reasons

Closes #57

---

## Summary

This PR implements **issue #57 — [Phase W4] Facility performance insights: turnaround times and rejection reasons**. It adds a dedicated **Performance insights** page (`/facility/insights`) where a facility can see its own operational performance and understand where to improve:

1. **Turnaround time** — median and p90 time from order assignment to fulfilment, with a fulfilment-speed distribution.
2. **Order volume by day** — received / fulfilled / rejected per day.
3. **Rejection reasons** — a breakdown of *why* orders were rejected.
4. **Dispute rate** — the share of orders that became disputes, plus how they resolved.

The page has a **date range filter**, **accessible charts with table alternatives**, a **client-side CSV export**, and is **aggregate-only — it never shows patient-level data**.

Implements the PRD §4 facility core flows (Phase W4).

---

## Description

### Background

Facilities compete on speed and reliability. Before this PR, a facility had no visibility into how fast it fulfils orders, why it rejects them, or how often those orders turn into disputes — the exact signals that let a facility improve and let the platform spot which partners need support. #57 closes that gap by surfacing the facility's own performance as aggregate metrics.

It depends on the fulfilment queue (#51 / docforum-core#8) for the underlying order lifecycle, and on an **aggregate insights endpoint in `docforum-core` that has not landed yet** (see "Assumed API contract" below). This view is where that endpoint is consumed.

### What was built

#### 1. Turnaround time card

`src/features/insights/components/FacilityTurnaroundCard.tsx`

- **Median turnaround** and **90th-percentile turnaround** (assignment → fulfilment), shown as the two headline stats, plus the fulfilled count and the fastest/slowest range for context.
- A **fulfilment-speed distribution** split into under-1h / 1–4h / 4–24h / over-24h buckets.
- A **small-sample caveat banner** when the fulfilled count is below the server's threshold.

#### 2. Order volume by day

`src/features/insights/components/FacilityVolumeChart.tsx`

- A grouped SVG bar chart of **received / fulfilled / rejected** per day in the selected range.
- Each bar carries a `<title>` tooltip with the exact date and count.
- Empty ranges render a friendly "no order volume recorded" message rather than an empty chart.

#### 3. Rejection reasons

`src/features/insights/components/FacilityRejectionReasonsCard.tsx`

- Per-reason count and percentage of all rejections, with human labels (falling back to a title-cased code).
- Handles the "no rejections in this period" case.

#### 4. Dispute rate

`src/features/insights/components/FacilityDisputeCard.tsx`

- Dispute rate (disputes per 100 orders), open disputes, and average resolution time.
- A resolution-outcome breakdown table (facility favour / patient favour / open).
- A small-sample caveat when the order count is low.

#### 5. Cross-cutting concerns

- **Date range filter** — reuses `DateRangeSelector` (7 / 30 / 90-day presets + custom range) and re-queries the endpoint.
- **Accessible charts (requirement):** every chart has a **chart/table view toggle**, and the semantic data table is *also* present in the accessibility tree while in chart mode (visually hidden only), so screen-reader users always get the numbers. SVG bars have accessible `<title>` elements.
- **CSV export (requirement):** client-side only, serialising the aggregates already on screen — it never triggers a further fetch. It reuses the audit CSV helpers, so spreadsheet-formula injection stays neutralised, and writes an U+FEFF BOM so Excel reads UTF-8.
- **No patient-level data (reviewer-critical):** the model (`FacilityPerformanceInsights`) carries only totals, rates and distributions — **no names, order ids or per-order rows**. The page shows an explicit on-screen statement to that effect, and a handler test asserts the serialised payload contains no `patientName` / `patientProfileId` / order-id fields.
- **Small numbers labelled as such:** low-volume periods set `sampleSizeWarning`, which the turnaround and dispute cards surface as "not representative" caveats.

#### 6. Wiring

- New route `/facility/insights` in `src/App.tsx`, gated to the `facility` role.
- New `FacilityInsightsPage` (page shell + tab bar), `FacilityInsightsView` (loads the query, range state, export), and `useFacilityInsights` React Query hook.
- **Performance** links added to the header nav (`Layout.tsx`) and the facility tab bar on the queue, verify, team and payouts pages.

---

## Assumed API contract (dependency not yet landed)

The issue notes this depends on an **aggregate endpoint in `docforum-core`** (which does not exist yet). The shape below is **assumed** and mirrored in `src/types/models.ts` under "Phase W4 — Facility Performance Insights", and documented in `ARCHITECTURE_ESSENTIALS.md` "Known assumptions".

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/facilities/:facilityId/insights?preset=&startDate=&endDate=` | `FacilityPerformanceInsights` |

- `FacilityPerformanceInsights = { facilityId, range, generatedAt, turnaround, volumeByDay, rejectionReasons, disputes }`.
- `turnaround`: `{ fulfilledCount, medianHours, p90Hours, minHours, maxHours, within1h, within4h, within24h, over24h, sampleSizeWarning }`.
- `volumeByDay`: `{ date (YYYY-MM-DD), received, fulfilled, rejected }[]`.
- `rejectionReasons`: `{ code, label, count, percentage }[]`.
- `disputes`: `{ totalOrders, disputedOrders, disputeRate, resolvedInFacilityFavour, resolvedInPatientFavour, openDisputes, averageResolutionHours, sampleSizeWarning }`.

All calls go through `docforum-core`'s API via `apiFetch` — **no direct Stellar/escrow calls** (architecture hard rule 1). If the real endpoint differs, the single places to change are `src/types/models.ts` and `src/services/insights-service.ts`.

### Aggregate-only guarantee — the important caveat

This client sends and receives **only aggregates**. There is no patient-level field anywhere in the model or UI. **However, the real guarantee must come from the server**: the aggregate endpoint must aggregate before responding and must never include patient identifiers or per-order rows. The client-side test is a guard against regression in *this* repo, not a substitute for the server contract.

---

## Acceptance checklist

- [x] Facility insights page (`/facility/insights`), role-gated to `facility`.
- [x] Median and p90 turnaround (assignment → fulfilment).
- [x] Volume by day (received / fulfilled / rejected).
- [x] Rejection reasons breakdown.
- [x] Dispute rate with resolution outcomes.
- [x] Date range filter (presets + custom).
- [x] Accessible charts with table alternatives (toggle + always-present semantic table).
- [x] CSV export, client-side, from the fetched aggregates.
- [x] **Only aggregate data — never patient details**, stated on screen and asserted in tests.
- [x] **Small numbers labelled as such.**
- [x] Tests for the view, sub-components, CSV/format helpers and the mock handler.
- [x] Discoverable from the header nav and every facility page.
- [x] `ROADMAP.md` and `ARCHITECTURE_ESSENTIALS.md` updated (per repo rules).
- [x] Desktop + mobile screenshots.

---

## Tests

- `src/features/insights/facility-insights.test.ts` — `formatHours`, rejection label fallback, and CSV export (sections, escaping, no patient fields).
- `src/features/insights/components/FacilityInsights.test.tsx` — view renders all four sections, states the aggregate-only guarantee, exposes a table alternative for every chart, labels small samples, and reports an error instead of stale data; plus sub-component tests including empty ranges.
- `src/mocks/handlers.test.ts` — added facility insights handler coverage: correct shape, date-range passthrough, and a test asserting the payload contains **no patient-level identifiers**.

### Results

```
npm run typecheck   # clean
npm test            # 42 files, 389/389 tests passing
npm run build       # green  (tsc -b && vite build)
npm run check:dist  # green  (no mock code in production bundle)
```

---

## Screenshots

Captured with Playwright against the mock dev server, desktop (1440×1000) and mobile (390×844):

- `screenshots/facility-insights-desktop.png` / `-mobile.png` — full insights page.
- `screenshots/facility-insights-turnaround-table-desktop.png` / `-mobile.png` — turnaround table view.
- `screenshots/facility-insights-disputes-desktop.png` / `-mobile.png` — dispute rate section.

---

## Screens changed / PRD flows

- **New screen:** Facility Performance Insights (`/facility/insights`) — implements the PRD §4 facility performance flow (Phase W4, `docforum-core`).
- **Touched screens:** added a Performance tab link to the facility queue, verify, team and payouts pages (navigation only).

---

## How this will be reviewed

- **No patient-level data:** the reviewer can confirm by reading `FacilityPerformanceInsights` in `src/types/models.ts` (aggregate fields only) and the on-screen `aggregate data only` notice, and by the handler test that greps the payload for patient identifiers.
- **Decimal/aggregate correctness:** turnaround hours and rates are computed server-side; the client only formats them.

## Follow-ups / notes for maintainers

- File/land the aggregate `docforum-core` endpoint and reconcile the assumed shape above; the touched files are listed.
- Server must enforce the aggregate-only contract — the client cannot guarantee it.
- Consider a shared threshold for `sampleSizeWarning` across doctor and facility insights once the backend defines it.
