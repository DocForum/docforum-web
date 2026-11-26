import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routes } from '../../e2e/routes';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const routeFile = (name: string) => source(`src/routes/${name}.tsx`);

/** Keep this reader tied to the literal route definitions; a new path added
 * to any area must have a concrete mock URL in the axe route list. */
function sourcePatterns(): string[] {
  const expected = new Set<string>();
  for (const area of ['public', 'patient', 'doctor', 'facility', 'admin']) {
    for (const match of routeFile(area).matchAll(/\bpath:\s*'([^']+)'/g)) {
      const path = match[1];
      if (path.endsWith('/*')) expected.add(`/${path.slice(0, -2)}`);
      else expected.add(path.startsWith('/') ? path : `/${path}`);
    }
  }
  for (const match of source('src/pages/PatientDashboardPage.tsx').matchAll(/<Route\s+path="([^"]+)"/g)) {
    const path = match[1];
    expected.add(`/patient/${path.endsWith('/*') ? path.slice(0, -2) : path}`);
  }
  const publicPages = source('src/pages/public-routes.ts');
  for (const match of publicPages.matchAll(/\bpath:\s*'(\/[^']*)'/g)) expected.add(match[1]);
  expected.add('/missing-route'); // the root `*` route
  return [...expected].sort();
}

describe('axe route coverage', () => {
  it('has one concrete URL for every router pattern', () => {
    const listed = routes.map((route) => route.template ?? route.path);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(sourcePatterns());
  });
});
