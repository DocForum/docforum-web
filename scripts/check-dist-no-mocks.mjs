// Fails (exit 1) if any string that only exists inside src/mocks/** shows
// up in the real app's bundle in dist/. Run as `npm run check:dist` after
// `npm run build`; wired into CI so mock-mode code can never silently
// ship to production (issue #95).
//
// Demo mode (issue #127) intentionally ships mock code to the Pages
// preview, but only as a lazily imported chunk named `demo-<hash>.{js,css}`
// (see the manualChunks rule in vite.config.ts). Those files are skipped
// here; everything the main entry loads — and every other asset — is still
// scanned, so a static import of src/mocks or src/demo into app code is
// still caught.
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
let demoChunks = 0;

for (const file of walk(DIST)) {
  // The lazy demo chunk is allowed to contain mock code by design.
  if (/(^|[\\/])demo-[^\\/]+\.(js|css)$/.test(file)) {
    demoChunks += 1;
    continue;
  }
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

console.log(
  `✓ no mock code in the production app bundle (${scanned} files scanned; ` +
    `${demoChunks} lazy demo chunk file${demoChunks === 1 ? '' : 's'} skipped)`,
);
