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
  carets are disabled, the light theme is fixed, and fonts are ready before
  capture.

To review a legitimate visual change, run the update command **inside the
same pinned container** from the repository root:

```sh
docker run --rm --ipc=host -v "$PWD:/work" -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  sh -lc 'npm ci && npm run test:e2e:update'
git diff -- e2e/__screenshots__
```

Inspect each changed PNG and commit it with the UI change. CI uploads the
HTML report and failed actual/diff images from `test-results/` even when the
suite fails. Run `npm run test:e2e` again before opening a PR.
