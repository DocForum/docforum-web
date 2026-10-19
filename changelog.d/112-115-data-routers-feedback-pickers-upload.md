Phase W7: data routers, mutation feedback, accessible pickers and shared
file upload
([issue #112](https://github.com/DocForum/docforum-web/issues/112),
[#113](https://github.com/DocForum/docforum-web/issues/113),
[#114](https://github.com/DocForum/docforum-web/issues/114),
[#115](https://github.com/DocForum/docforum-web/issues/115)).

`src/router.tsx` replaces the component tree and `RequireAuth` with a
configurable data router (`createBrowserRouter` by default, `createHashRouter`
when `VITE_USE_HASH_ROUTER=true`), lazy route modules, loaders that prefetch
the exact React Query keys/shapes pages read, per-section `RouteError`, and
guards that await the single-flight `POST /auth/refresh` restore. Toasts,
`useOptimisticMutation` and `useDeferredAction` now back message mark-read,
invite revoke and queue start/complete (payments excluded). `DatePicker` and
`TimePicker` replace every native date input with keyboard/screen-reader
support, typed entry, min/max, disabled dates and explicit time zones.
`Upload` adds drag-and-drop, mobile camera capture, progress/cancel/retry,
signature-based type sniffing, size limits and image downscaling through a new
`apiUploadFile` XHR helper. CSF story files for the three components are in
place ahead of Storybook (#97); new assumed shapes (refresh, upload) are
recorded in `ARCHITECTURE_ESSENTIALS.md`.
