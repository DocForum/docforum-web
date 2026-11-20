---
file: ARCHITECTURE_ESSENTIALS.md
section: Testing utilities & coverage gate (issue #105)
---
### Coverage gate folders and floors (issue #292)

`vite.config.ts` `test.coverage` gates the whole measured set **and** each of
the two folders that joined it in #292 separately:

| Set | statements | branches | functions | lines |
| --- | --- | --- | --- | --- |
| aggregate — `src/features`, `src/services`, `src/components`, `src/hooks` | 78 | 70 | 77 | 79 |
| `src/components/**` | 87 | 82 | 89 | 88 |
| `src/hooks/**` | 95 | 89 | 95 | 97 |

The per-folder floors are the levels measured on 2026-11-20, the day both
folders entered the gate (vitest treats any non-threshold key in
`thresholds` as a glob and checks that glob's own summary, so a shared
component or hook can no longer drop to zero tests while the aggregate keeps
clearing 78). The aggregate floors are unchanged from #105: adding these two
well-covered folders moved the measured total *up* (82.7 / 74.6 / 81.5 / 84.8),
so lowering nothing was possible and nothing was lowered.

`src/pages/**` stays out of the gate — pages compose the folders above and are
covered through them — and `src/mocks/**` is dev-only. `**/*.test.*`,
`**/*.stories.*`, `**/*.d.ts` and the `index.ts` barrels (re-exports only, no
behaviour) are excluded.
