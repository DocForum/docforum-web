PR #161: merged `upstream/main` again after the W7 platform-quality and
API-client/PWA/i18n work landed there (#151, #157), and resolved the
conflicts without dropping either side.

Kept this branch's data router, `DatePicker`/`TimePicker`, `Upload` and the
toast-backed mutation feedback, and adopted upstream's pieces on top of them:
`I18nProvider` plus the app-level `ErrorBoundary` and `UpdatePromptContainer`
around `RouterProvider`, `IntlProvider` in the test render helpers, the
queue's locale-aware labels and live-region announcements, and the
`@docforum/api-client` transport — `apiUploadFile` is now the only addition
on top of it. The queue keeps the shared toast undo rather than the inline
undo bar, the patient hub keeps its own route file with upstream's
translations, and the custom date range keeps upstream's labelled fieldset
around the branch's pickers.
