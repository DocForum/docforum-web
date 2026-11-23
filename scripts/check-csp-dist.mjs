// Build-time guard for the production Content Security Policy (issue #225).
//
// GitHub Pages cannot set response headers, so the CSP lives in a <meta> tag
// and the production policy is `script-src 'self'` / `style-src 'self'` with
// no inline allowance. Any inline <script>, <style>, style attribute or on*
// handler in the built HTML is therefore a runtime CSP violation. This scanned
// the prerendered output that ships, not just the source template.
//
// It also proves the pre-hydration locale shell survived the move out of
// index.html (issue #225): the classic same-origin script must still be
// referenced before the module script, and the file must exist in dist.
//
// Run after `npm run build`: `npm run check:csp`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = join(process.cwd(), 'dist');

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `npm run build` before `npm run check:csp`.');
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const problems = [];
const pages = [...walk(DIST)];

for (const page of pages) {
  const name = relative(DIST, page).replace(/\\/g, '/');
  const html = readFileSync(page, 'utf8');
  const fail = (message) => problems.push(`${name}: ${message}`);

  // --- The policy itself must still be strict -----------------------------
  const meta = html.match(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
  if (!meta) {
    fail('missing Content-Security-Policy meta tag');
  } else {
    const content = meta[0].match(/content="([^"]*)"/i)?.[1] ?? '';
    const directive = (name) =>
      content.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`, 'i'))?.[1]?.trim() ?? '';

    for (const source of ['script-src', 'style-src']) {
      const value = directive(source);
      if (!value) fail(`CSP has no ${source} directive`);
      if (/unsafe-inline|unsafe-eval/i.test(value)) {
        fail(`CSP ${source} allows inline/eval ("${value}") — the strict policy was weakened`);
      }
    }
    if (directive('require-trusted-types-for') !== "'script'") {
      fail("CSP no longer requires Trusted Types for 'script'");
    }
  }

  // --- Nothing the strict policy would block ------------------------------
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes, body] = match;
    if (!/\bsrc\s*=/i.test(attributes) && body.trim()) {
      fail('inline <script> body — script-src \'self\' blocks it');
    }
  }

  if (/<style\b/i.test(html)) {
    fail('inline <style> block — style-src \'self\' blocks it');
  }

  const styleAttribute = html.match(/\sstyle\s*=\s*["'][^"']*["']/i);
  if (styleAttribute) {
    fail(`inline style attribute (${styleAttribute[0].trim().slice(0, 60)}…) — style-src 'self' blocks it`);
  }

  const inlineHandler = html.match(/<[^>]+\s(on[a-z]+)\s*=\s*["'][^"']*["']/i);
  if (inlineHandler) {
    fail(`inline ${inlineHandler[1]} handler — script-src 'self' blocks it`);
  }

  // --- Pre-hydration locale shell (issue #225) ----------------------------
  const prehydrate = [...html.matchAll(/<script\b([^>]*\bsrc\s*=\s*["']([^"']*prehydrate-locale\.js)["'][^>]*)>/gi)];
  if (prehydrate.length === 0) {
    fail('missing pre-hydration locale script (prehydrate-locale.js)');
  } else {
    const [, attributes, src] = prehydrate[0];
    if (/type\s*=\s*["']module["']/i.test(attributes)) {
      fail('pre-hydration locale script must stay a classic script');
    }
    if (/\b(?:async|defer)\b/i.test(attributes)) {
      // Vite hoists the module entry into <head>; it is deferred, so this
      // script must run during parsing to paint before the bundle runs.
      fail('pre-hydration locale script must not be async/deferred — it would run after the app');
    }
    if (!src.startsWith('/')) {
      fail(`pre-hydration locale script src "${src}" is not root-absolute and breaks under a base path`);
    }
  }
}

if (!existsSync(join(DIST, 'prehydrate-locale.js'))) {
  problems.push('prehydrate-locale.js was not copied into dist/ (public/ asset missing)');
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(
    '\nThe production CSP allows no inline scripts or styles. Move the code to a same-origin ' +
      'file/class or update the CSP in vite.config.ts deliberately.',
  );
  process.exit(1);
}

console.log(`✓ no CSP-blockable inline code in ${pages.length} built page(s); pre-hydration shell present`);
