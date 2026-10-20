import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this as a project site at /docforum-web/, not the
// domain root — base must match or every asset URL 404s. Only applied for
// the production build (dev server still runs at /).
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/docforum-web/' : '/',
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    // Tests parse the real index.html template, which references Google
    // Fonts — happy-dom must not fetch external stylesheets during a run
    // (network noise, and a hidden CI dependency). The link then reports
    // a normal 'load' instead of erroring on every parse.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableCSSFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
