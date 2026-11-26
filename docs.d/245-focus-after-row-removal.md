---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Focus stays in the list after removing or revoking a row. Tracked as [issue #245](https://github.com/DocForum/docforum-web/issues/245): `src/hooks/useRowRemovalFocus.ts` focuses the next row's primary control, else the previous row, else the list heading, and restores focus to a row whose optimistic removal rolls back. Applied to the facility member and pending-invite lists, the API key and webhook panels and the availability slot actions, with each removal announced through `useAnnouncer`.
