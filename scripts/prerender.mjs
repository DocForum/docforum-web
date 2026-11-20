#!/usr/bin/env node
/**
 * Prerender the public pages after `vite build` (issue #120).
 *
 * Reads `dist/index.html` as the template, renders each route through the
 * SSR entry (`vite build --ssr src/prerender/entry-server.tsx`, output in
 * `dist-ssr/`), writes `dist/<route>/index.html` for every public route
 * (including the landing page at `dist/index.html`), then writes
 * `dist/sitemap.xml` and `dist/robots.txt`.
 *
 * Every page is validated before this script exits non-zero on any
 * problem, so `npm run build` (and therefore CI) fails if prerendering
 * produces wrong metadata, empty content, or authenticated UI.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const templatePath = join(distDir, 'index.html');

const failures = [];
const note = (message) => failures.push(message);

if (!existsSync(templatePath)) {
  console.error('✗ dist/index.html not found — run `vite build` before the prerender step.');
  process.exit(1);
}
if (!existsSync(ssrDir)) {
  console.error('✗ dist-ssr/ not found — run `vite build --ssr src/prerender/entry-server.tsx` first.');
  process.exit(1);
}

const entryFile = readdirSync(ssrDir).find((name) => name.startsWith('entry-server.'));
if (!entryFile) {
  console.error(`✗ no entry-server.* bundle in dist-ssr/ (found: ${readdirSync(ssrDir).join(', ')})`);
  process.exit(1);
}

const template = readFileSync(templatePath, 'utf8');
const {
  PUBLIC_PAGES,
  BUILD_BASE,
  renderPublicPage,
  prerenderPage,
  validatePrerenderedHtml,
  buildSitemap,
  buildRobots,
  canonicalUrl,
} = await import(pathToFileURL(join(ssrDir, entryFile)).href);

if (!Array.isArray(PUBLIC_PAGES) || PUBLIC_PAGES.length === 0) {
  console.error('✗ entry-server exported no PUBLIC_PAGES');
  process.exit(1);
}

const base = typeof BUILD_BASE === 'string' && BUILD_BASE ? BUILD_BASE : '/';
const writtenFiles = [];
const titles = new Set();

for (const def of PUBLIC_PAGES) {
  let html;
  try {
    const appHtml = renderPublicPage(def.path);
    if (!appHtml || !appHtml.trim()) {
      note(`${def.path}: renderPublicPage returned empty markup`);
      continue;
    }
    html = prerenderPage({ template, appHtml, def, base });
  } catch (error) {
    note(`${def.path}: prerender threw — ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  for (const problem of validatePrerenderedHtml(html, def)) {
    note(`${def.path}: ${problem}`);
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch?.[1] ?? '(none)';
  if (titles.has(title)) note(`${def.path}: duplicate <title> "${title}"`);
  titles.add(title);

  const outFile =
    def.path === '/' ? join(distDir, 'index.html') : join(distDir, def.path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  writtenFiles.push({ def, outFile, html });
}

const sitemap = buildSitemap(PUBLIC_PAGES.map((page) => page.path));
const robots = buildRobots();

const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
if (locs.length !== PUBLIC_PAGES.length) {
  note(`sitemap lists ${locs.length} URLs, expected ${PUBLIC_PAGES.length}`);
}
const canonicalSet = new Set(PUBLIC_PAGES.map((page) => canonicalUrl(page.path)));
for (const loc of locs) {
  if (loc.includes('#')) note(`sitemap entry advertises a hash URL: ${loc}`);
  if (!canonicalSet.has(loc)) note(`sitemap entry is not a public canonical URL: ${loc}`);
}
for (const privatePath of ['/login', '/signup', '/patient', '/doctor', '/facility', '/admin', '/care']) {
  if (sitemap.includes(`${privatePath}<`) || sitemap.includes(`${privatePath}/<`)) {
    note(`sitemap advertises a non-public route: ${privatePath}`);
  }
}
if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) {
  note('robots.txt is missing a user-agent/allow policy');
}
if (!robots.includes(`Sitemap: ${canonicalUrl('/')}sitemap.xml`)) {
  note('robots.txt does not point at the sitemap');
}

writeFileSync(join(distDir, 'sitemap.xml'), sitemap);
writeFileSync(join(distDir, 'robots.txt'), robots);

for (const { def, outFile } of writtenFiles) {
  if (!existsSync(outFile)) note(`${def.path}: ${outFile} was not written`);
}

if (failures.length > 0) {
  console.error(`✗ prerender failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `✓ prerendered ${writtenFiles.length} public page(s) at base "${base}" → sitemap.xml + robots.txt`,
);
for (const { def, outFile } of writtenFiles) {
  console.log(`  ${def.path} → ${outFile.slice(root.length + 1)}`);
}
