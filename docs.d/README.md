# docs.d

One new file per PR for durable API or architecture notes that should not be
lost in the PR description. Use `docs.d/<issue-number>-<short-slug>.md`.

## Adding your entry

1. Create the fragment with the issue number and a short slug.
2. Describe the contract or decision, what is assumed versus confirmed, and
   anything the next contributor must know.
3. Commit it in the same PR as the change.

Keep `ARCHITECTURE_ESSENTIALS.md` for cross-cutting rules and known gaps;
use a fragment for the detail specific to one change.
