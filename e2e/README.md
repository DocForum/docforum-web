# Browser test suites

`npm run test:e2e` starts one Vite mock server and runs Playwright against the
existing browser MSW handlers in `src/mocks/`. Fixtures are visibly fake and
use `example.test` addresses. CI uses
`mcr.microsoft.com/playwright:v1.64.1-noble` to keep Chromium and font
rendering stable.

- `journeys.spec.ts` checks interactions, role guards, a one-time MSW network
  failure with React Query retry, cold-start latency, and exact payment
  mutation counts. It exercises the implemented care thread and facility finder;
  doctor search, booking, intake, appointment list and doctor order issuance
  still have no corresponding screens in this repo. Those steps must be added
  to the test when the W2/W3 product screens land. The 409 booking case cannot
  be tested in the browser until the booking UI exists.
- `accessibility.spec.ts` scans every concrete route in `routes.ts` in light
  and reduced motion modes. New axe findings fail. Known findings require an
  exact route, rule, target and a link to a tracking issue in
  `axe-allowlist.json`; do not add broad rule exclusions. The baseline is
  currently empty after fixing all findings detected at rollout.
- `visual.spec.ts` compares desktop and mobile screenshots. Animations and
  carets are disabled, fonts are ready before capture, and each project pins a
  theme through the same `docforum-theme` key the app reads on boot:
  `visual-desktop`/`visual-mobile` capture light, `visual-dark` captures dark
  and `visual-hc` captures high contrast (issue #296). The extra themes are
  desktop-only to keep CI time down.

On a PR, screenshot differences are **report only**: the Browser job shows a
warning and lists the changed screens in its summary, but doesn't fail. You
don't need to update baselines yourself. After a merge, the `Visual baselines`
workflow regenerates them on main and pushes the result to the
`chore/refresh-visual-baselines` branch, where a maintainer reviews the image
diffs in a PR. Do check the `playwright-report` artifact: if a screen changed
in a way you didn't intend, that's a bug to fix in your PR. Journeys,
accessibility and landscape tests still fail the job as usual.

To update baselines yourself anyway, run the update command **inside the
same pinned container** from the repository root:

```sh
docker run --rm --ipc=host -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  sh -lc 'npm ci && npm run test:e2e:update && npx playwright test --project=visual-dark --project=visual-hc --update-snapshots'
git diff -- e2e/__screenshots__
```

Inspect each changed PNG and commit it with the UI change. CI uploads the
HTML report and failed actual/diff images from `test-results/` even when the
suite fails. Run `npm run test:e2e` again before opening a PR.
