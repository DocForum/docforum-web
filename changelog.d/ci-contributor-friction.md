CI: less friction for contributors. Screenshot differences on PRs now only
report (a warning plus the list of changed screens); the new `Visual baselines`
workflow regenerates the baselines after each merge and pushes them to
`chore/refresh-visual-baselines` for a maintainer to review. The PR preview
build no longer re-runs typecheck and unit tests (the Frontend job already
does), so one failing test is one red check. `Docs fragments` now fails only
when a PR adds lines straight to a shared doc; a fragment that wouldn't fold
is a warning with a suggested fix (closest headings, or the shared doc that
has the heading), shown inline on the PR.
