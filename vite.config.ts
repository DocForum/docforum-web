import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

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

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "connect-src 'self' https://docforum-core-api.onrender.com",
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
      return html.replace('<head>', `<head>\n    ${meta}`);
    },
  };
}

export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  return {
    base: process.env.GITHUB_PAGES ? '/docforum-web/' : '/',
    plugins: [react(), cspPlugin(isProd)],
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
