// Reports every service call against docforum-core's documented endpoints
// (issue #301).
//
// Why: services grew from assumptions, and the vendored OpenAPI file was
// written from the frontend's side. This script extracts `apiFetch`-family
// calls from `src/services/*` and `packages/api-client/src/client.ts` and
// compares each method + path with the endpoint table in docforum-core's
// `docs/api/README.md`, printing:
//
//   documented — core's docs list the method + path
//   assumed    — the call sits under an `ASSUMED` comment in the service
//   drifted    — neither, so it may not exist in core
//
// It is a report, not code generation (that is #96). Run it with
// `npm run check:contract-drift`. It is wired into CI as a warn-only step:
// it never fails the build.
//
// Where core's docs come from, in order:
//   1. `--core-path <path>` or `DOCFORUM_CORE_PATH` — a local docforum-core
//      checkout (the file may be the docs directory or the README itself).
//   2. `DOCFORUM_CORE_REF` (or the CI default below) — the raw file is
//      fetched from GitHub at that pinned ref.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CORE_REPO = 'DocForum/docforum-core';
const CORE_DOC_PATH = 'docs/api/README.md';
const PINNED_REF = 'c65217bc9c02041078700f3a551e01235d9e123c';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

function normalizePath(path) {
  let out = path.trim();
  out = out.replace(/^['"`]|['"`]$/g, '');
  out = out.replace(/\?.*$/, '');
  // A template expression after a path segment is a query string
  // (`/doctors${toQuery(filters)}`); one after a slash is a path param.
  out = out.replace(/\$\{[^}]*\}/g, (match, offset, whole) =>
    whole[offset - 1] === '/' ? '{}' : '',
  );
  out = out.replace(/\/+$/, '');
  out = out.replace(/\{[^/}]*\}/g, '{}');
  out = out.replace(/:[A-Za-z_][\w]*/g, '{}');
  return out || '/';
}

/** Read one call argument starting just after the opening paren. */
function readArgument(source, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return { value: source.slice(start, i), end: i };
      depth -= 1;
    } else if (ch === ',' && depth === 0) {
      return { value: source.slice(start, i), end: i };
    }
  }
  return { value: source.slice(start), end: source.length };
}

const CALL = /\bapi(Fetch|FetchBlob|FetchForm|Upload)\s*(?:<[^>]*>)?\s*\(/g;

function callsInFile(file) {
  const source = readFileSync(file, 'utf8');
  const found = [];
  for (const match of source.matchAll(CALL)) {
    const open = match.index + match[0].length;
    const arg = readArgument(source, open);
    const rawPath = arg.value.trim();
    if (!rawPath.startsWith("'") && !rawPath.startsWith('"') && !rawPath.startsWith('`')) {
      continue; // Only literal paths can be checked statically.
    }
    const rest = source.slice(arg.end, arg.end + 600);
    const methodMatch = rest.match(/\bmethod:\s*['"](\w+)['"]/);
    const method = (methodMatch?.[1] ?? 'GET').toUpperCase();
    const callStart = match.index;
    // `ASSUMED` notes sit above the exported function, so look back far enough
    // to include the doc comment but stop at an unrelated earlier function.
    const assumedAt = source.lastIndexOf('ASSUMED', callStart);
    const between = assumedAt === -1 ? '' : source.slice(assumedAt, callStart);
    const assumed = assumedAt !== -1 && (between.match(/\nexport /g) ?? []).length <= 1;
    found.push({
      method,
      path: normalizePath(rawPath),
      file: relative(ROOT, file),
      line: source.slice(0, callStart).split('\n').length,
      assumed,
    });
  }
  return found;
}

function serviceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...serviceFiles(join(dir, entry.name)));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name === 'api-client.ts') continue;
    files.push(join(dir, entry.name));
  }
  return files;
}

function parseCoreDocs(text) {
  const endpoints = new Set();
  const linePattern = /\b(GET|POST|PUT|PATCH|DELETE)\b[^\n`|]*?(\/[A-Za-z0-9_{}:./?=&$*<>-]*)/g;
  for (const line of text.split('\n')) {
    for (const match of line.matchAll(linePattern)) {
      endpoints.add(`${match[1]} ${normalizePath(match[2])}`);
    }
  }
  return endpoints;
}

async function loadCoreDocs() {
  const local = argValue('--core-path') ?? process.env.DOCFORUM_CORE_PATH;
  const candidates = local
    ? [local, join(local, CORE_DOC_PATH), join(local, 'api', 'README.md')]
    : ['docforum-core', join('docforum-core', CORE_DOC_PATH)];

  for (const candidate of candidates) {
    const file = existsSync(candidate) && candidate.endsWith('.md') ? candidate : join(candidate, CORE_DOC_PATH);
    if (existsSync(file)) {
      return { text: readFileSync(file, 'utf8'), source: file };
    }
  }

  if (candidates.some((candidate) => existsSync(candidate))) {
    const dir = candidates.find((candidate) => existsSync(candidate));
    console.warn(`! ${join(dir, CORE_DOC_PATH)} not found; reading an empty endpoint table.`);
    return { text: '', source: 'none' };
  }

  const ref = process.env.DOCFORUM_CORE_REF || PINNED_REF;
  const url = `https://raw.githubusercontent.com/${CORE_REPO}/${ref}/${CORE_DOC_PATH}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { text: await response.text(), source: `${CORE_REPO}@${ref.slice(0, 7)}` };
  } catch (error) {
    console.warn(`! could not read core's endpoint docs from ${url} (${error.message}).`);
    console.warn('  Pass --core-path <dir> or set DOCFORUM_CORE_PATH to a local checkout.');
    return { text: '', source: 'unavailable' };
  }
}

const docs = await loadCoreDocs();
const documented = parseCoreDocs(docs.text);

const files = [...serviceFiles(join(ROOT, 'src', 'services')), join(ROOT, 'packages', 'api-client', 'src', 'client.ts')];
const calls = files.flatMap((file) => callsInFile(file));

const rows = calls.map((call) => {
  const key = `${call.method} ${call.path}`;
  const status = documented.has(key) ? 'documented' : call.assumed ? 'assumed' : 'drifted';
  return { ...call, key, status };
});

const order = { drifted: 0, assumed: 1, documented: 2 };
rows.sort((a, b) => order[a.status] - order[b.status] || a.key.localeCompare(b.key));

const counts = rows.reduce(
  (acc, row) => ({ ...acc, [row.status]: acc[row.status] + 1 }),
  { documented: 0, assumed: 0, drifted: 0 },
);

console.log(`Core endpoint docs: ${docs.source} (${documented.size} endpoints)\n`);
console.log('STATUS      METHOD PATH                                          WHERE');
console.log('-'.repeat(100));
for (const row of rows) {
  console.log(
    `${row.status.padEnd(11)} ${row.method.padEnd(6)} ${row.key.slice(row.method.length + 1).padEnd(45)} ${row.file}:${row.line}`,
  );
}

console.log(
  `\n${counts.documented} documented · ${counts.assumed} assumed · ${counts.drifted} drifted (of ${rows.length} calls)`,
);
if (counts.drifted > 0) {
  console.log(
    'Drifted calls are not in core\'s docs: check them against core, then either fix the path or mark the call with an `ASSUMED` comment.',
  );
}
if (!documented.size) {
  console.log('No endpoint table was loaded, so every call is reported as drifted/assumed.');
}
console.log('\nWarn-only: this report never fails the build (#301).');
