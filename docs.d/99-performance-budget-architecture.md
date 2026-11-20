---
file: ARCHITECTURE_ESSENTIALS.md
section: Phase W7 — Platform quality (issues #116–#119)
---
#### Performance budget (issue #99)
- `performance-budget.json` holds the bundle budgets; `npm run check:bundle` (CI, after `npm run build`) fails when first-load JS (entry + modulepreloads, gzip) or any lazy chunk exceeds them, and writes the numbers to the job summary. Raise a budget only in a PR that explains why.
- Lighthouse CI (`.lighthouserc.json`, `lighthouse` job in `ci.yml`) runs against the mock-only preview build (hash routing, MSW, reserved-invalid API origin; `?previewRole=` for signed-in pages) and fails on LCP, CLS, TBT or script-size regressions. Its script-size budget (450 kB transferred per page) is for that mock build: it includes the MSW mock layer (~120 kB gzip) that production never ships, on top of the production entry (~171 kB gzip) and the heaviest signed-in route (patient dashboard, ~420 kB measured). The production first-load budget is the `check:bundle` one. Desktop preset, median of three runs, so shared runners don't make it flaky; the gzip budget protects mobile download cost deterministically.
- `npm run analyze` writes the rollup-visualiser treemap to `bundle-stats/` (git-ignored); CI uploads it as the `bundle-stats` artifact.
- GSAP stays behind `import('gsap')` in `useMotion` and is not fetched at all under `prefers-reduced-motion: reduce`. Route fallbacks reserve space (`.routeFallback`) so lazy loading does not shift the footer.
