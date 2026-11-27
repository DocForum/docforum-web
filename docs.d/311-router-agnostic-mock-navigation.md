---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Make the mock dev panel router-agnostic. Tracked as [issue #311](https://github.com/DocForum/docforum-web/issues/311): role switch and sign-out use a shared clean-path role-home map and `src/mocks/navigation.ts`, which writes the hash in HashRouter mode and pushes history plus a `popstate` in BrowserRouter mode. Deep links are detected from the hash or pathname according to the same router flag, including PR preview builds, and `check:dist` proves the bridge stays out of production.
