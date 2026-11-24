import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const sourceFilePattern = /\.(?:css|mjs|ts|tsx)$/;
const prohibitedPatterns = [
  { pattern: /(?:from\s+|import\s*\(\s*)['"](?:@stellar\/|stellar-sdk)/, reason: 'a direct Stellar SDK import' },
  { pattern: /new\s+Horizon\.Server\s*\(|(?:from\s+|import\s*\(\s*)['"]@stellar\/horizon-client/, reason: 'a direct Horizon client' },
  { pattern: /https?:\/\/[^'"\s]*(?:horizon|soroban|rpc)\b/i, reason: 'a direct Stellar network URL' },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (sourceFilePattern.test(entry.name)) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await sourceFiles(sourceRoot)) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, index) => {
    for (const { pattern, reason } of prohibitedPatterns) {
      if (pattern.test(line)) violations.push(`${relative(process.cwd(), file)}:${index + 1} contains ${reason}`);
    }
  });
}

if (violations.length > 0) {
  console.error('Stellar boundary check failed:');
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Stellar boundary check passed: no direct Stellar SDK, Horizon client, or network URL in src/.');
}
