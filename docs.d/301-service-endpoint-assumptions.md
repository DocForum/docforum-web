---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Service endpoint assumptions (issue #301)

`npm run check:contract-drift` is the live inventory. It extracts every
`apiFetch`-family call from `src/services/*` and `packages/api-client/src/client.ts`
and marks each one `documented` (in core's `docs/api/README.md`), `assumed`
(or `drifted` when neither, i.e. no evidence core serves it).

- A call is `assumed` when the service puts an `ASSUMED` comment directly above
  the exported function, explaining what core has not shipped yet. That comment
  is the only place to record the assumption, so the report stays truthful as
  endpoints land.
- Marking a call `assumed` does not make the path correct. It means the
  frontend knows the contract is provisional; fix the call when core's docs
  list it under a different method or path.
- The report reads a local `docforum-core` checkout (`--core-path` or
  `DOCFORUM_CORE_PATH`) or fetches the pinned ref (`DOCFORUM_CORE_REF`). It runs
  warn-only in CI: a drifted row is a review prompt, never a merge blocker.
