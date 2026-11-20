#!/usr/bin/env node
// Warn-only contract-version check (CI step, see .github/workflows/ci.yml).
//
// Compares the installed @docforum/api-client version with the API version
// advertised by the backend's live OpenAPI spec. A client that is behind the
// backend is how contract drift sneaks back in, so CI surfaces it — but this
// is advisory until docforum-core owns publishing the spec (docforum-core#113),
// hence exit 0 by default. Pass `--strict` to fail the build instead.
//
// Usage:
//   node scripts/check-version.mjs [--strict]
//   DOCFORUM_SPEC_URL=https://... node scripts/check-version.mjs
import { readFileSync } from 'node:fs';

const strict = process.argv.includes('--strict');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const specUrl = process.env.DOCFORUM_SPEC_URL ?? 'https://docforum-core-api.onrender.com/openapi.json';

function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value ?? '').trim());
  return match ? match.slice(1).map(Number) : null;
}

function compare(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function finish(message, isFailure) {
  if (isFailure && strict) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`${isFailure ? '⚠' : '✓'} ${message}`);
  if (isFailure) console.log('  (warn-only for now; re-run with --strict to make this fatal)');
}

const installed = parseVersion(pkg.version);
if (!installed) {
  finish(`Cannot parse installed @docforum/api-client version "${pkg.version}".`, true);
  process.exit(0);
}

let backendVersion;
try {
  const response = await fetch(specUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const spec = await response.json();
  backendVersion = spec?.info?.version;
} catch (error) {
  // Backend unreachable/cold-starting is not a contract signal — never block
  // on it, even in strict mode. Surfaced so the pipeline log shows why the
  // check was skipped.
  console.log(`⚠ Could not read ${specUrl} (${error instanceof Error ? error.message : error}).`);
  console.log('  Skipping API client version check.');
  process.exit(0);
}

const latest = parseVersion(backendVersion);
if (!latest) {
  finish(`Backend spec did not advertise a semver info.version ("${backendVersion ?? 'missing'}").`, true);
  process.exit(0);
}

const comparison = compare(installed, latest);
if (comparison < 0) {
  finish(
    `@docforum/api-client ${pkg.version} is behind the backend spec (${backendVersion}). ` +
      'Regenerate from the published spec: npm run generate:api.',
    true,
  );
} else if (comparison > 0) {
  finish(
    `@docforum/api-client ${pkg.version} is ahead of the backend spec (${backendVersion}) — expected during rollout.`,
    false,
  );
} else {
  finish(`@docforum/api-client ${pkg.version} matches the backend spec.`, false);
}
