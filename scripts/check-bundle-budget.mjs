#!/usr/bin/env node
// Bundle-size budget (issue #99). Runs after `vite build` in CI and fails
// the job when first-load JavaScript or any lazy chunk grows past its
// budget. Deterministic (gzip of the built files), so it catches a size
// regression on every PR without depending on Lighthouse's network timing;
// Lighthouse CI (.lighthouserc.json) covers LCP/CLS/TBT on real pages.
//
// "First load" = the entry script in dist/index.html plus every chunk it
// statically imports or modulepreloads — what every visitor downloads
// before any route chunk. Budgets live in performance-budget.json.
//
//   node scripts/check-bundle-budget.mjs           # check
//   node scripts/check-bundle-budget.mjs --report  # also print every chunk
import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const budgets = JSON.parse(readFileSync(join(root, 'performance-budget.json'), 'utf8')).bundle;
const report = process.argv.includes('--report');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('✗ dist/index.html not found — run a build first.');
  process.exit(1);
}

const gz = (file) => gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

// Assets referenced by index.html (entry + modulepreloads), resolved through
// the base path (`/` or `/docforum-web/`).
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:src|href)="[^"]*?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);

// Follow static `import ... from "./x.js"` edges from those entries: Vite
// hoists shared vendor code into chunks the entry imports statically.
const firstLoad = new Set();
const queue = [...referenced];
while (queue.length > 0) {
  const file = queue.shift();
  if (firstLoad.has(file)) continue;
  firstLoad.add(file);
  const code = readFileSync(join(dist, file), 'utf8');
  for (const match of code.matchAll(/(?:^|[;}\s])import\s*(?:[\w${},*\s]+from\s*)?["']\.\/([^"']+\.js)["']/g)) {
    queue.push(`assets/${match[1]}`);
  }
}

const allChunks = readdirSync(join(dist, 'assets')).filter((file) => file.endsWith('.js'));
const sizes = new Map(allChunks.map((file) => [`assets/${file}`, gz(`assets/${file}`)]));
const firstLoadBytes = [...firstLoad].reduce((sum, file) => sum + (sizes.get(file) ?? 0), 0);
const lazy = [...sizes].filter(([file]) => !firstLoad.has(file)).sort((a, b) => b[1] - a[1]);

const failures = [];
if (firstLoadBytes > budgets.firstLoadJsGzipKb * 1024) {
  failures.push(`first-load JS ${kb(firstLoadBytes)} gzip exceeds budget ${budgets.firstLoadJsGzipKb} kB`);
}
for (const [file, bytes] of lazy) {
  if (bytes > budgets.maxLazyChunkGzipKb * 1024) {
    failures.push(`${file} ${kb(bytes)} gzip exceeds lazy-chunk budget ${budgets.maxLazyChunkGzipKb} kB`);
  }
}

const lines = [
  `First-load JS: ${kb(firstLoadBytes)} gzip (budget ${budgets.firstLoadJsGzipKb} kB) across ${firstLoad.size} file(s)`,
  ...[...firstLoad].map((file) => `  ${file.padEnd(48)} ${kb(sizes.get(file) ?? 0)}`),
  `Lazy chunks: ${lazy.length}; largest ${lazy[0] ? `${lazy[0][0]} ${kb(lazy[0][1])}` : 'none'} (budget ${budgets.maxLazyChunkGzipKb} kB each)`,
  ...(report ? lazy.map(([file, bytes]) => `  ${file.padEnd(48)} ${kb(bytes)}`) : lazy.slice(0, 8).map(([file, bytes]) => `  ${file.padEnd(48)} ${kb(bytes)}`)),
];
console.log(lines.join('\n'));

// Surface the numbers on the PR's job summary when running in Actions.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    ['### Bundle budget (issue #99)', '', '```', ...lines, '```', ''].join('\n'),
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  console.error('Split the new code into a lazy route/feature chunk, or — if the growth is intended — raise the budget in performance-budget.json in the same PR and say why.');
  process.exit(1);
}
console.log('✓ Bundle within budget');
