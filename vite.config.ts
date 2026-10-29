import { configDefaults, defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this as a project site at /docforum-web/, not the
// domain root — base must match or every asset URL 404s. Only applied for
// the production build (dev server still runs at /).
//
// Content Security Policy (issue #101):
//   - Dev (`vite` command): relaxed policy — Vite HMR injects inline scripts
//     and React dev may use eval, so `unsafe-inline`/`unsafe-eval` are
//     allowed there only.
//   - Build (`npm run build`): strict policy — `script-src 'self'`, no inline
//     scripts or styles, `connect-src` limited to the API origin, fonts and
//     API preconnect are same-origin or listed explicitly.
// The plugin injects `<meta http-equiv="Content-Security-Policy">` into
// index.html on every dev request and on the production build output.

// API origin allowed in `connect-src` — taken from VITE_API_BASE_URL when it
// is set (the PR-preview build points it at a reserved-invalid host so the
// preview can never reach the real backend — issue #104), and defaulting to
// the deployed docforum-core API otherwise.
const API_ORIGIN = (() => {
  const raw = process.env.VITE_API_BASE_URL ?? 'https://docforum-core-api.onrender.com';
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
})();

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  `connect-src 'self' ${API_ORIGIN}`,
  "img-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // ignored in a meta tag; enforced via HTTP header where supported
  "require-trusted-types-for 'script'", // Chrome/Edge; no DOM XSS sinks in the app
].join('; ');

const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite HMR + React Fast Refresh
  "style-src 'self' 'unsafe-inline'", // Vite injects CSS via <style> tags in dev
  "font-src 'self'",
  "connect-src 'self' http://localhost:4000 ws://localhost:5173", // API + HMR socket
  "img-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(isProd: boolean): Plugin {
  const csp = isProd ? PROD_CSP : DEV_CSP;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  return {
    name: 'docforum-csp',
    transformIndexHtml(html: string) {
      // index.html preconnects to the real API host; a preview build must not
      // (issue #104), so the preconnect follows the configured API origin —
      // the same one used in connect-src above.
      return html
        .replace('https://docforum-core-api.onrender.com', API_ORIGIN)
        .replace('<head>', `<head>\n    ${meta}`);
    },
  };
}

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  return {
    // `VITE_BASE_PATH` lets a static host serve the app from a subpath without
    // touching the main Pages build. Everything else keeps the GitHub Pages /
    // root behaviour.
    base:
      process.env.VITE_BASE_PATH ??
      (process.env.GITHUB_PAGES ? '/docforum-web/' : '/'),
    plugins: [
      react(),
      cspPlugin(isProd),
      VitePWA({
        // injectManifest (not generateSW) so the caching policy is real,
        // reviewable source: src/pwa/sw.ts. Only the app shell + hashed static
        // assets are precached; there is no runtime caching, so API responses
        // can never be stored by the worker (issue #86).
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        registerType: 'prompt',
        // Registration is handled by UpdatePromptContainer via
        // virtual:pwa-register/react so the "update available" banner can hook in.
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'DocForum',
          short_name: 'DocForum',
          description: 'Care continuity, escrow-secured fulfillment.',
          lang: 'en',
          theme_color: '#1f4d3a',
          background_color: '#faf6f0',
          display: 'standalone',
          orientation: 'portrait',
          // Relative URLs resolve against the manifest's own location, which is
          // what makes the same manifest work at / and at /docforum-web/.
          start_url: '.',
          scope: '.',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // index.html is the HashRouter entry point; every route is served
          // from it by the NavigationRoute in src/pwa/sw.ts.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
      }),
    ],
    // The workspace package is TS source (not a prebuilt dist), so Vite must
    // transpile it rather than pre-bundle it.
    optimizeDeps: { exclude: ['@docforum/api-client'] },
    test: {
      exclude: [...configDefaults.exclude, 'e2e/**'],
      environment: 'happy-dom',
      globals: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      // Coverage gate (issue #105). Only the folders that hold product logic
      // are measured: `pages/` and `components/` are mostly composition and
      // were never part of the gate, and `src/mocks/` is dev-only.
      // Thresholds are the current measured levels (see ARCHITECTURE_ESSENTIALS.md
      // "Testing utilities & coverage gate") — they ratchet up as tests land,
      // never down. CI runs `npm run test:coverage`, so a regression fails.
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'json-summary'],
        reportsDirectory: './coverage',
        include: ['src/features/**/*.{ts,tsx}', 'src/services/**/*.{ts,tsx}'],
        exclude: [
          '**/*.test.{ts,tsx}',
          '**/*.stories.{ts,tsx}',
          '**/*.d.ts',
          // Barrel/re-export only, no behaviour to cover.
          'src/features/**/index.ts',
        ],
        // Floor measured when the gate was introduced (see
        // ARCHITECTURE_ESSENTIALS.md "Testing utilities & coverage gate").
        // Raise these when tests land; never lower them.
        thresholds: {
          statements: 78,
          branches: 70,
          functions: 77,
          lines: 79,
        },
      },
    },
  };
});
