// Fails (exit 1) if any string that only exists inside src/mocks/** shows
// up in the production bundle in dist/. Run as `npm run check:dist` after
// `npm run build`; wired into CI so mock-mode code can never silently
// ship to production (issue #95).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

// Unique literals from src/mocks/** — one per mock-only module.
const FORBIDDEN_MARKERS = [
  'Mock scenario: forced server error (dev panel)', // mocks/helpers.ts
  'mock-access-token', // mocks/fixtures.ts
  'mock-dev-panel-root', // mocks/setup.ts
  'MOCK API', // mocks/DevPanel.tsx (panel title/pill)
  'setupWorker', // msw/browser entry
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(js|css|html)$/.test(entry.name)) yield path;
  }
}

let leaked = false;
let scanned = 0;

for (const file of walk(DIST)) {
  scanned += 1;
  const content = readFileSync(file, 'utf8');
  for (const marker of FORBIDDEN_MARKERS) {
    if (content.includes(marker)) {
      leaked = true;
      console.error(`✗ mock marker ${JSON.stringify(marker)} found in ${file}`);
    }
  }
}

if (leaked) {
  console.error(
    '\nMock-mode code leaked into the production bundle. Ensure src/mocks/** is only ' +
      'imported behind the `import.meta.env.DEV && VITE_ENABLE_MOCKS` guard in src/main.tsx.',
  );
  process.exit(1);
}

console.log(`✓ no mock code in production bundle (${scanned} files scanned)`);
