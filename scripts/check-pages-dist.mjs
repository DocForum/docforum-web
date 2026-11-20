import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

const BASE = '/docforum-web/';
const ORIGIN = 'https://docforum.github.io';
const DIST = join(process.cwd(), 'dist');
const failures = [];

function fail(message) {
  failures.push(message);
}

function localFile(urlValue, source) {
  let url;
  try {
    url = new URL(urlValue, `${ORIGIN}${BASE}`);
  } catch {
    fail(`${source}: invalid URL ${JSON.stringify(urlValue)}`);
    return;
  }

  if (url.origin !== ORIGIN) return;
  if (!url.pathname.startsWith(BASE)) {
    fail(`${source}: ${url.pathname} is outside the Pages base ${BASE}`);
    return;
  }

  const relative = decodeURIComponent(url.pathname.slice(BASE.length));
  const file = normalize(join(DIST, relative));
  if (file !== DIST && !file.startsWith(`${DIST}${sep}`)) {
    fail(`${source}: ${url.pathname} escapes dist`);
    return;
  }
  if (!existsSync(file)) fail(`${source}: ${url.pathname} does not exist in dist`);
}

const indexPath = join(DIST, 'index.html');
const manifestPath = join(DIST, 'manifest.webmanifest');
for (const file of [indexPath, manifestPath, join(DIST, '404.html'), join(DIST, 'pages-redirect.js')]) {
  if (!existsSync(file)) fail(`missing ${file.slice(DIST.length + 1)}`);
}

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    localFile(match[1], 'index.html script');
  }
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = match[1];
    const rel = /\brel=["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase() ?? '';
    const href = /\bhref=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (href && /^(stylesheet|icon|apple-touch-icon|manifest|modulepreload|preload)$/.test(rel)) {
      localFile(href, `index.html link[rel=${rel}]`);
    }
  }
}

if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const assets = [
    ...(manifest.icons ?? []),
    ...(manifest.screenshots ?? []),
    ...(manifest.shortcuts ?? []).flatMap((shortcut) => shortcut.icons ?? []),
  ];
  for (const asset of assets) localFile(asset.src, 'manifest asset');
}

if (failures.length) {
  console.error(`✗ Pages artifact check failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`✓ Pages assets exist under ${BASE}; 404 fallback is present`);
