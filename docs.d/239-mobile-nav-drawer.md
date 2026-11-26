---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Mobile navigation drawer is a modal dialog, closed drawer is inert. Tracked as [issue #239](https://github.com/DocForum/docforum-web/issues/239): the closed drawer carries `inert` (no tabbable descendants, no `aria-hidden-focus` violation), the open drawer is a `role="dialog"` labelled "Mobile navigation menu" around the labelled nav, uses the shared `useFocusTrap` (focus re-computed per keypress), closes on Escape, returns focus to the toggle and marks the page behind it `inert`.
