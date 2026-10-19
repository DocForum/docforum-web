import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this as a project site at /docforum-web/, not the
// domain root — base must match or every asset URL 404s. Only applied for
// the production build (dev server still runs at /).
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/docforum-web/' : '/',
  plugins: [
    react(),
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
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
