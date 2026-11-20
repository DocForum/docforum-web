Phase W1: `?previewRole=` is now a mock/preview-build convenience only
([issue #224](https://github.com/DocForum/docforum-web/issues/224)). The
production bundle no longer reads it or writes a fake `preview-token`
session, so opening the Pages deploy with `?previewRole=admin` leaves the
visitor signed out. Reading and stripping the parameter moved into
`src/mocks/roles.ts`/`src/mocks/setup.tsx` behind the existing
`mocksEnabled` guard and reuses `activateMockRole`, and the parameter is
removed from the URL after use. `npm run check:dist` now fails if
`preview-token` or `previewRole` appears in a production bundle, and
CONTRIBUTING explains where the parameter is supported. PR preview builds
(`VITE_PREVIEW_MOCKS=true`) keep the convenience.
