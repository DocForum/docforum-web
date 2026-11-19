# docs.d

New content for the shared docs goes here, one file per change, instead of
straight into the doc.

When every PR added its lines to `ROADMAP.md`, `ARCHITECTURE_ESSENTIALS.md`
and `README.md`, most PRs inserted text at the same few places, so
each merge put the other open PRs into conflict. A new file per PR never
collides with anyone else's. A maintainer folds the fragments into the docs
in batches.

The shared docs are listed in [`config.json`](config.json). For this repo:
`ROADMAP.md`, `ARCHITECTURE_ESSENTIALS.md` and `README.md`.

## The rule

In a shared doc, **change existing lines in place, but don't add new ones**.
CI fails a PR whose diff adds lines to a shared doc.

- Ticking your item's checkbox (`- [ ]` → `- [x]`) or correcting a line is
  fine: that's an in-place change.
- A new roadmap item, paragraph, table row, API listing line or section goes
  in a fragment.
- Changelog entries still go in [`changelog.d/`](../changelog.d/README.md).

## Writing a fragment

Create `docs.d/<issue-number>-<short-slug>.md` (add `-2`, `-3` for more than
one). Each fragment adds one block of text to one place in one doc. Start it
with a front matter block naming the doc and where the text goes, then write
the text exactly as it should appear.

**Under a heading** (`section:`), for example a new roadmap item:

```markdown
---
file: ROADMAP.md
section: Phase W6 — Admin console
---
- [x] Admin announcements banner. Tracked as [issue #321](https://github.com/DocForum/docforum-web/issues/321):
  `src/features/admin-announcements/`, `/admin/announcements`.
```

or a new subsection in the architecture notes:

```markdown
---
file: ARCHITECTURE_ESSENTIALS.md
section: Privacy and platform guarantees
---
### Announcement banners (issue #321)

Banners never include patient data; dismissals are stored per device only.
```

- The text goes at the end of that heading's own text, before its first
  subheading. If your text starts with its own heading (`### …`), as above, it
  goes at the end of the whole section instead, after the existing subsections.
- Headings are matched without the `#`s, ignoring case and backticks. If the
  same heading appears twice, name its parent too:
  `section: Parent heading > Repeated heading`.
- List items and table rows join the list or table they follow; anything else
  is separated by a blank line.

**After a specific line** (`after:`), when the text belongs in the middle of
a section or a code block:

```markdown
---
file: ROADMAP.md
after: "- [x] Audit and access log viewer."
---
- [ ] Audit log saved filters (issue #322).
```

- `after:` is any text that appears on exactly one line of the doc. Quote
  enough of the line to make it unique. CI tells you if it matches no line or
  more than one.
- Inside a fenced code block, your lines are inserted exactly as written.

Several fragments may target the same place; they go in filename order.

CI (`Docs fragments`) checks that every fragment folds cleanly against the
current docs, so a typo in a heading fails your PR instead of the fold. To
check locally:

```bash
node scripts/docs-fragments.mjs check origin/main
```

## Folding (maintainers)

```bash
node scripts/docs-fragments.mjs fold --dry-run   # preview
node scripts/docs-fragments.mjs fold             # apply and delete the fragments
```

Commit the result in its own PR, together with the `changelog.d/` fold if one
is due. Maintainer PRs skip the "no new lines" rule (CI passes `--maintainer`
when the PR's branch is in this repo rather than a fork, or its author is an
org owner or public member), but fragments are still validated.
