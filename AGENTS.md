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
  every other repo in the org.
