Phase W2: intake draft autosave and resume infrastructure (issue #36)
([issue #36](https://github.com/DocForum/docforum-web/issues/36)).
Added in-memory Zustand store for intake drafts with unsaved changes warning hook.
Drafts survive route changes and failed submits but are never persisted to
localStorage/sessionStorage/IndexedDB (enforced by tests). Designed to integrate
with the booking flow (issue #2) once that feature is implemented.
