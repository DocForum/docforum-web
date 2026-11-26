---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Serve self-hosted fonts as subsetted WOFF2 and precache them. Tracked as [issue #308](https://github.com/DocForum/docforum-web/issues/308): the seven Fraunces/IBM Plex Sans faces ship as Latin + Latin Extended WOFF2 with OFL licences, `font-display: swap`, `unicode-range`, a recomputed stylesheet SRI hash and a preload for the above-the-fold IBM Plex Sans 400 face. `vite.config.ts` already precaches `woff2`, so the installed app renders the same fonts offline.
