---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
- [x] Unique, translated document title on every route. Tracked as [issue #237](https://github.com/DocForum/docforum-web/issues/237): `src/hooks/useDocumentTitle.ts` titles each screen `<page> · DocForum` from the route metadata in `src/navigation/breadcrumbs.ts`, so labels are translated, follow a language change, and are generic for record pages (no patient or medication names). Public pages keep their own `usePageMeta` metadata; `e2e/accessibility.spec.ts` asserts every route in `e2e/routes.ts` has a non-empty, product-named, PHI-free title that no other route shares.
