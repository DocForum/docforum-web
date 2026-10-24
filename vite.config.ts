import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

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
//
// Notes that keep the policy enforceable without console noise:
//   - `frame-ancestors` is NOT in the meta policy: Chrome drops it from
//     <meta> entirely and logs a console error on every page load (which
//     fails Lighthouse's errors-in-console check). It can only be enforced
//     via an HTTP response header, which GitHub Pages cannot set.
//   - Zod v4's JIT compiles validators with `new Function`, which this
//     policy blocks. `src/zod-csp.ts` runs Zod in `jitless` mode instead of
//     widening the policy — see that file.

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self' https://docforum-core-api.onrender.com",
  "img-src 'self' data:",
  "base-uri 'self'",
  "form-action 'self'",
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
      return html.replace('<head>', `<head>\n    ${meta}`);
    },
  };
}

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  return {
    base: process.env.GITHUB_PAGES ? '/docforum-web/' : '/',
    plugins: [
      react(),
      cspPlugin(isProd),
      ...(process.env.ANALYZE === 'true'
        ? [visualizer({ filename: 'dist/bundle-analysis.html', open: false, gzipSize: true, brotliSize: true })]
        : []),
    ],
    build: {
      // First-party source maps (issue #99): Lighthouse's valid-source-maps
      // audit fails when large JS ships without maps, and they make
      // production stack traces readable. Maps are only fetched when
      // DevTools is open, so they don't affect load performance budgets.
      sourcemap: true,
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
