import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ATTEMPTS = 6;
const RETRY_DELAY_MS = 5000;
const TIMEOUT_MS = 15000;

const ALLOWED_TYPES = {
  html: ['text/html'],
  script: ['application/javascript', 'text/javascript', 'application/ecmascript'],
  'service-worker': ['application/javascript', 'text/javascript', 'application/ecmascript'],
  style: ['text/css'],
  manifest: ['application/manifest+json', 'application/json'],
  font: ['font/woff2'],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeBaseUrl(input) {
  if (!input) throw new Error('usage: check-deployed-site.mjs <pages-url>');
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('the Pages URL must use http or https');
  }
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function contentTypeOf(response) {
  return (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
}

function pathOf(url) {
  return url.pathname;
}

function labelFor(ref) {
  const labels = {
    html: 'HTML shell',
    script: 'script',
    'service-worker': 'service worker',
    style: 'stylesheet',
    manifest: 'manifest',
    font: 'preloaded font',
  };
  return `${labels[ref.kind]} ${pathOf(ref.url)}`;
}

export function parseReferences(html, baseUrl) {
  const refs = new Map();

  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    const url = new URL(match[2], baseUrl);
    refs.set(`script:${url.href}`, { kind: 'script', url });
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim().toLowerCase();
    const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim();
    if (!rel || !href) continue;

    const rels = rel.split(/\s+/);
    let kind = null;
    if (rels.includes('stylesheet')) kind = 'style';
    else if (rels.includes('manifest')) kind = 'manifest';
    else if (rels.includes('preload')) {
      const as = tag.match(/\bas\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim().toLowerCase();
      const type = tag.match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim().toLowerCase();
      if (as === 'font' || type === 'font/woff2') kind = 'font';
    }
    if (!kind) continue;

    const url = new URL(href, baseUrl);
    refs.set(`${kind}:${url.href}`, { kind, url });
  }

  const manifest = new URL('manifest.webmanifest', baseUrl);
  refs.set(`manifest:${manifest.href}`, { kind: 'manifest', url: manifest });
  const serviceWorker = new URL('sw.js', baseUrl);
  refs.set(`service-worker:${serviceWorker.href}`, { kind: 'service-worker', url: serviceWorker });

  return [...refs.values()];
}

function validateBody(ref, body, documentRefs) {
  if (ref.kind === 'html') {
    if (!/<div\b[^>]*\bid\s*=\s*(["'])root\1[^>]*>/i.test(body)) {
      throw new Error('missing #root mount point');
    }
    if (documentRefs.length > 0) {
      const scripts = documentRefs.filter((candidate) => candidate.kind === 'script');
      if (!scripts.some((candidate) => /(^|\/)assets\/[^/]+\.js$/.test(candidate.url.pathname))) {
        throw new Error('no hashed script found in index.html');
      }
    }
  }
  if (ref.kind === 'manifest') {
    const manifest = JSON.parse(body);
    if (!manifest || typeof manifest !== 'object' || !manifest.name || !manifest.start_url) {
      throw new Error('manifest is missing name or start_url');
    }
  }
  if (ref.kind !== 'html' && body.length === 0) {
    throw new Error('empty response body');
  }
}

async function fetchChecked(ref, documentRefs) {
  let lastError;
  let lastStatus;
  let lastType;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(ref.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      lastStatus = response.status;
      lastType = contentTypeOf(response);
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      if (!ALLOWED_TYPES[ref.kind].includes(lastType)) {
        throw new Error(`content-type ${lastType || 'missing'}`);
      }

      const body = await response.text();
      validateBody(ref, body, documentRefs);
      return { ref, status: response.status, type: lastType, attempt, ok: true, body };
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  const failure = new Error(`${labelFor(ref)} failed after ${ATTEMPTS} attempts: ${lastError?.message}`);
  failure.attempt = ATTEMPTS;
  failure.status = lastStatus;
  failure.type = lastType;
  failure.ref = ref;
  throw failure;
}

function cell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function writeSummary(baseUrl, results, error) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const lines = [
    '## Pages deploy smoke check',
    '',
    `Target: \`${baseUrl?.href ?? 'invalid URL'}\``,
    '',
    '| Resource | Result | HTTP | Content-Type | Attempts |',
    '| --- | --- | --- | --- | --- |',
    ...results.map((result) => {
      const { ref, ok, status, type, attempt, error: failure } = result;
      return `| ${cell(labelFor(ref))} | ${ok ? 'PASS' : 'FAIL'} | ${cell(status ?? '—')} | ${cell(type ?? '—')} | ${cell(attempt ?? '—')}${failure ? ` — ${cell(failure.message)}` : ''} |`;
    }),
    '',
    error ? `**Result: failed** — ${cell(error.message)}` : '**Result: passed**',
    '',
  ];
  appendFileSync(summaryPath, lines.join('\n'));
}

export async function checkDeployedSite(baseUrl) {
  const results = [];
  const html = { kind: 'html', url: baseUrl };

  try {
    const shell = await fetchChecked(html, []);
    const refs = parseReferences(shell.body, baseUrl);
    try {
      validateBody(shell.ref, shell.body, refs);
    } catch (error) {
      results.push({ ...shell, ok: false, error });
      return results;
    }
    results.push(shell);
    const checks = await Promise.all(
      refs.map(async (ref) => {
        try {
          return await fetchChecked(ref, refs);
        } catch (error) {
          return {
            ref,
            ok: false,
            status: error.status,
            type: error.type,
            attempt: error.attempt ?? ATTEMPTS,
            error,
          };
        }
      }),
    );
    results.push(...checks);
  } catch (error) {
    results.push({
      ref: html,
      ok: false,
      status: error.status,
      type: error.type,
      attempt: error.attempt ?? ATTEMPTS,
      error,
    });
  }

  return results;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  let baseUrl;
  let results = [];
  let error;

  try {
    baseUrl = normalizeBaseUrl(process.argv[2]);
    results = await checkDeployedSite(baseUrl);
    const failures = results.filter((result) => !result.ok);
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} resource(s) failed: ${failures.map((failure) => failure.error?.message ?? labelFor(failure.ref)).join('; ')}`,
      );
    }
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error(String(caught));
    process.exitCode = 1;
  }

  writeSummary(baseUrl, results, error);
  if (error) {
    console.error(`✗ ${error.message}`);
  } else {
    console.log(`✓ live Pages site responded with valid shell, assets, manifest and service worker (${baseUrl.href})`);
  }
}
