// Policy guard (issue #113): money movement is never updated optimistically.
// The UI must show what the escrow/ledger actually did, never a guess that
// gets "rolled back" after funds may already have moved. This test fails CI
// if anyone reaches for the optimistic helpers — or hand-writes an
// `onMutate` cache write — in payment code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');

/** Folders and files whose mutations move money or touch escrow. */
const MONEY_PATHS = [
  'src/features/payments',
  'src/features/fulfillment',
  'src/features/admin-disputes',
  'src/services/payments-service.ts',
];

const FORBIDDEN = [/useOptimisticMutation/, /optimisticHandlers/, /useUndoableAction/, /\bonMutate\s*:/];

function sourceFiles(path: string): string[] {
  const full = join(root, path);
  let stats;
  try {
    stats = statSync(full);
  } catch {
    return [];
  }
  if (stats.isFile()) return [full];
  return readdirSync(full).flatMap((entry) => sourceFiles(join(path, entry)));
}

describe('optimistic update policy', () => {
  it('scans the money paths (guards against the list silently going stale)', () => {
    expect(sourceFiles('src/features/payments').length).toBeGreaterThan(5);
  });

  it('never uses optimistic updates or delayed commits for money movement', () => {
    const offenders: string[] = [];
    for (const file of MONEY_PATHS.flatMap(sourceFiles)) {
      if (!/\.(ts|tsx)$/.test(file) || /\.test\.(ts|tsx)$/.test(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(source)) offenders.push(`${relative(root, file)} matches ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
