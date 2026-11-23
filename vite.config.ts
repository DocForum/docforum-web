import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this as a project site at /docforum-web/, not the
// domain root — base must match or every asset URL 404s. Only applied for
// the production build (dev server still runs at /).
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/docforum-web/' : '/',
  plugins: [react()],
  build: {
    // No modulepreload hints: Vite would otherwise add one for the lazy
    // demo chunk to index.html, making every ordinary visit download the
    // whole mock API (600 kB) it never uses. The demo chunk still loads
    // (with its CSS) when `?demo=1` actually imports it, and this app has
    // no other code-split entry to preload.
    modulePreload: false,
    rollupOptions: {
      output: {
        // MSW, the fixtures/handlers and the demo chrome (issue #127) all
        // become one lazily imported `demo-<hash>.js` chunk: a normal
        // session never downloads it. The fixed name is what lets
        // scripts/check-dist-no-mocks.mjs tell demo code apart from a leak
        // into the real app's bundle.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (path.includes('/src/mocks/') || path.includes('/src/demo/')) return 'demo';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
