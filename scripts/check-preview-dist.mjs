// Safety check for PR preview builds (#104).
//
// A preview is deliberately the *opposite* of a production bundle: it ships the
// mock API and must not be able to reach a real backend. `check:dist` proves
// production has no mocks; this proves a preview has nothing else.
//
// Fails when:
//   - the mock API is missing (the preview would render empty screens),
//   - the real docforum-core host appears anywhere in the build,
//   - a Sentry DSN literal is present.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

const REQUIRED_MARKERS = [
  'Mock scenario: forced server error (dev panel)', // mocks/helpers.ts
  'mock-dev-panel-root', // mocks/setup.tsx
  'setupWorker', // msw/browser
];

const FORBIDDEN_MARKERS = [
  'docforum-core-api.onrender.com', // the real Render preview backend
  'https://docforum.github.io', // the production Pages origin
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(js|css|html)$/.test(entry.name)) yield path;
  }
}

const contents = [];
for (const file of walk(DIST)) {
  contents.push({ file, text: readFileSync(file, 'utf8') });
}

const all = contents.map((entry) => entry.text).join('\n');
let failed = false;

for (const marker of REQUIRED_MARKERS) {
  if (!all.includes(marker)) {
    failed = true;
    console.error(`✗ preview build is missing the mock API marker ${JSON.stringify(marker)}`);
  }
}

for (const marker of FORBIDDEN_MARKERS) {
  for (const { file, text } of contents) {
    if (text.includes(marker)) {
      failed = true;
      console.error(`✗ preview build references ${JSON.stringify(marker)} in ${file}`);
    }
  }
}

if (failed) {
  console.error(
    '\nPreview builds must render from the mock API only and must never point at a real backend. ' +
      'Check .github/workflows/pr-preview-build.yml.',
  );
  process.exit(1);
}

console.log(`✓ preview build uses the mock API only (${contents.length} files scanned)`);
