Phase W7: the pre-hydration language shell is no longer blocked by the
production CSP ([issue #225](https://github.com/DocForum/docforum-web/issues/225)).
The inline script in `index.html` moved to `public/prehydrate-locale.js`, loaded
as a same-origin classic script before the module entry and base-aware through
`%BASE_URL%`, so Spanish browsers still get "Cargando DocForum…" and
`<html lang="es">` on first paint without `script-src` ever allowing inline
code. The footer analytics link's inline `style` prop became a CSS class, since
prerendered public pages ship that attribute and `style-src 'self'` refused it.
`npm run check:csp` (run in CI after the build) now scans every built and
prerendered HTML page for inline scripts/styles/handlers and verifies the
pre-hydration file ships. `require-trusted-types-for 'script'` is unchanged.

No API shape is assumed, so no docs.d fragment accompanies this change.
