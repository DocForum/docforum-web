# AGENTS.md — docforum-web

Instructions for coding agents working in this repo specifically.

**Read `docforum-core`'s `PRD.md` and `AGENTS.md` first** — this file only
adds frontend-specific rules on top of those. Org-wide rules (doc-update
requirements, module boundary discipline, roadmap-update-every-contribution)
apply here identically.

## Rules specific to this repo
- Follow `ARCHITECTURE_ESSENTIALS.md` in this repo, especially hard rule 1
  (never call `docforum-escrow`/Stellar directly from this repo).
- Every PR that adds/changes a screen tied to a PRD core flow should note
  which flow (PRD §4, in `docforum-core`) it implements, in the PR
  description.
- Update `ROADMAP.md` in this repo on every contribution — same rule as
  every other repo in the org. Tick or update your own item's line, and put
  the changelog entry in a new file under `changelog.d/` (see below).

## Shared docs: keep your diff to your own lines

Many PRs are open at the same time and most of them touch the same docs.
Edits to shared lines are what put PRs into merge conflict with each other.

- Add your own line or table row. Don't rewrite, reorder or re-wrap
  paragraphs you don't need to change.
- Changelog entries go in a new file under `changelog.d/`, never at the end
  of `ROADMAP.md` (see `changelog.d/README.md`). Leave the status summary at
  the top of `ROADMAP.md` and each phase's `**Status:**` line to maintainers.
- Don't put running totals in docs ("57 tests", "Last updated: …"). CI and
  git history already record them, and every PR would have to change them.
- Commit docs as plain text and change only the lines you mean to. Never
  commit a file as base64, or regenerate a whole doc to make a small change.
