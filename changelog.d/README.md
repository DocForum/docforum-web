# changelog.d

One new file per PR for the `ROADMAP.md` changelog. This avoids every open
PR editing the same lines in `ROADMAP.md`.

## Adding your entry

1. Create `changelog.d/<issue-number>-<short-slug>.md`, for example
   `changelog.d/121-first-run-onboarding.md`.
2. Write the entry as plain Markdown: what changed, which issue or roadmap
   item it closes, and anything the next contributor should know. A short
   paragraph is usually enough. Don't add a date or a leading `- `.
3. Commit it in the same PR as your change.

Tick your own roadmap checkbox (`- [ ]` → `- [x]`) and edit your own item's
line. Leave the `## Changelog` section and phase status summaries alone;
maintainers fold fragments in when merging.
