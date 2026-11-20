---
file: ARCHITECTURE_ESSENTIALS.md
section: Testing utilities & coverage gate (issue #105)
---
### Coverage gate folders and floors (issue #292)

`vite.config.ts` `test.coverage` gates the whole measured set **and** each of
the two folders that joined it in #292 separately:

| Set | floor stmt/branch/fn/line | measured 2026-11-20 |
| --- | --- | --- |
| aggregate — `src/features`, `src/services`, `src/components`, `src/hooks` | 78 / 70 / 77 / 79 | 83.5 / 75.2 / 82.2 / 85.4 |
| `src/components/**` | 87 / 82 / 89 / 88 | 88.2 / 82.4 / 89.7 / 88.9 |
| `src/hooks/**` | 95 / 89 / 95 / 97 | 95.6 / 91.0 / 95.7 / 97.9 |

The per-folder floors are the levels measured on 2026-11-20, the day both
folders entered the gate (vitest treats any non-threshold key in
`thresholds` as a glob and checks that glob's own summary, so a shared
component or hook can no longer drop to zero tests while the aggregate keeps
clearing 78). The aggregate floors are unchanged from #105: adding these two
well-covered folders moved the measured total *up*, so lowering nothing was
possible and nothing was lowered.

A floor is a claim about a tree, and `main` moves daily. Rebasing onto the
commits that landed while this was in review dropped `src/hooks/**` to
93.8 / 88.1 / 94.8 / 96.9 — not because a test was deleted, but because a new,
partly untested hook (`useUnsavedChangesGuard.ts`, from #329) arrived in the
gated folder. The gate did its job: the fix was the missing cases, never the
number. Re-run `npm run test:coverage` after every rebase onto a `main` that
touched these two folders.

`src/pages/**` stays out of the gate — pages compose the folders above and are
covered through them — and `src/mocks/**` is dev-only. `**/*.test.*`,
`**/*.stories.*`, `**/*.d.ts` and the `index.ts` barrels (re-exports only, no
behaviour) are excluded.
