---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Smoke-check the live Pages site after every deploy. Tracked as [issue #306](https://github.com/DocForum/docforum-web/issues/306): `scripts/check-deployed-site.mjs` runs as a post-deploy job, retries briefly for CDN propagation, parses the published `index.html`, fetches every referenced script, stylesheet, font preload, `manifest.webmanifest` and `sw.js`, asserts 200 plus the expected content type, and writes a PASS/FAIL table to the workflow summary. No backend endpoints are called.
