---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---

- [x] Shared file upload control with progress, cancellation and mobile camera capture. Tracked as [issue #115](https://github.com/DocForum/docforum-web/issues/115) (High, 200 pts) — `src/components/Upload.tsx`, `src/components/upload-utils.ts`, and an XHR `apiUpload` in `src/services/api-client.ts`. Signature-based image/PDF validation, a 10 MB default, client-side image downscaling, drag-and-drop plus keyboard picker, per-file progress/cancel/retry, and file contents kept in component-local state.
