#!/usr/bin/env node
// CI guard for the message catalogues (issue #87).
//
// Checks, in order:
//   1. Every supported locale file exists and is valid JSON.
//   2. Every message id used in source has an entry in the English catalogue.
//   3. Every English catalogue key is actually referenced in source (no dead
//      strings accumulating as features are removed).
//   4. Every non-English catalogue has the same keys as English, and no
//      extras. A partial stub locale is allowed only with --allow-missing
//      (so the "second locale stub" can land before translation is complete).
//   5. ICU syntax parses for every message (react-intl's parser).
//
// Exits non-zero on any failure so CI fails before a missing key ships.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIntl, createIntlCache } from 'react-intl';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');
const localesDir = join(srcDir, 'i18n', 'messages');

const allowMissing = process.argv.includes('--allow-missing');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const sourceFiles = walk(srcDir).filter(
  (file) =>
    /\.(ts|tsx)$/.test(file) &&
    !/\.test\.(ts|tsx)$/.test(file) &&
    !file.includes(`${join('src', 'i18n')}`),
);

// Static ids referenced in code. Matches:
//   t('some.key', 'Default')
//   format('some.key', 'Default')
//   intl.formatMessage({ id: 'some.key', ... }) / formatMessage({ id: 'some.key' })
//   messageId: 'errors.foo' / actionMessageId: 'errors.actions.foo'
//
// Deliberately does NOT match a bare `id: '...'`: components use `id` for
// DOM ids, range presets (`'7d'`), tab keys and command ids, which are not
// message ids.
const ID_PATTERNS = [
  /\bt\(\s*['"]([\w.]+)['"]/g,
  /\bformat\(\s*['"]([\w.]+)['"]/g,
  /\bformatMessage\(\s*\{\s*id:\s*['"]([\w.]+)['"]/g,
  /\bmessageId:\s*['"]([\w.]+)['"]/g,
  /\bactionMessageId:\s*['"]([\w.]+)['"]/g,
];

// Dynamic prefixes resolved at runtime, e.g. t(`roles.${role}`).
const DYNAMIC_PREFIXES = [/\bt\(\s*`([\w.]+)\.\$\{/g];

const used = new Set();
const dynamicPrefixes = new Set();

for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of ID_PATTERNS) {
    for (const match of content.matchAll(pattern)) used.add(match[1]);
  }
  for (const pattern of DYNAMIC_PREFIXES) {
    for (const match of content.matchAll(pattern)) dynamicPrefixes.add(match[1]);
  }
}

// Locale list mirrors src/i18n/locales.ts (kept dependency-free on purpose).
const locales = ['en', 'es'];
const catalogues = {};

for (const locale of locales) {
  const path = join(localesDir, `${locale}.json`);
  try {
    catalogues[locale] = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${relative(root, path)}: ${error.message}`);
  }
}

const en = catalogues.en ?? {};

// 2. Used ids missing from English.
const missing = [...used].filter((id) => !(id in en)).sort();
if (missing.length) {
  fail(`Message ids used in code but missing from en.json:\n  ${missing.join('\n  ')}`);
}

// 3. Unused English keys (dynamic prefixes count as used).
const unused = Object.keys(en)
  .filter((id) => !used.has(id) && ![...dynamicPrefixes].some((prefix) => id.startsWith(`${prefix}.`)))
  .sort();
if (unused.length) {
  fail(`Message ids in en.json but not referenced in code:\n  ${unused.join('\n  ')}`);
}

// 4. Other locales vs English.
for (const locale of locales) {
  if (locale === 'en' || !catalogues[locale]) continue;
  const catalogue = catalogues[locale];
  const missingInLocale = Object.keys(en).filter((id) => !(id in catalogue)).sort();
  const extraInLocale = Object.keys(catalogue).filter((id) => !(id in en)).sort();

  if (missingInLocale.length && !allowMissing) {
    fail(`${locale}.json is missing ${missingInLocale.length} key(s):\n  ${missingInLocale.join('\n  ')}`);
  } else if (missingInLocale.length) {
    console.log(`⚠ ${locale}.json is a partial stub — ${missingInLocale.length} key(s) fall back to English.`);
  }
  if (extraInLocale.length) {
    fail(`${locale}.json has keys that are not in en.json:\n  ${extraInLocale.join('\n  ')}`);
  }
}

// 5. ICU parse check.
const intl = createIntl({ locale: 'en', messages: en }, createIntlCache());
for (const [id, message] of Object.entries(en)) {
  try {
    intl.formatMessage({ id });
  } catch (error) {
    fail(`Invalid ICU message "${id}": ${error.message}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  `✓ i18n catalogues OK — ${Object.keys(en).length} English keys, ${used.size} referenced, ${locales.length} locales.`,
);
