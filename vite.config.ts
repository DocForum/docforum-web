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
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
