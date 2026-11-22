Phase W7: performance budget — route-level code splitting, lazy GSAP and
Lighthouse CI ([issue #99](https://github.com/DocForum/docforum-web/issues/99)).
Every page is its own lazy chunk (via the #112 data router), so first-load JS
fell from 368 kB to 165 kB gzip (1,231 kB → 528 kB minified); GSAP is no
longer downloaded at all for reduced-motion users. `npm run check:bundle`
enforces `performance-budget.json` in CI, a new Lighthouse CI job
(`.lighthouserc.json`) fails on LCP/CLS/TBT/script-size regressions, and
`npm run analyze` produces the bundle treemap (uploaded as a CI artifact).
The two above-the-fold fonts and the landing route chunk are preloaded.
