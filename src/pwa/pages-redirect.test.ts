import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const base = '/docforum-web/';
const script = readFileSync(join(process.cwd(), 'scripts/pages-redirect.js'), 'utf8')
  .replace("'__BASE_PATH__'", JSON.stringify(base));

function redirect(pathname: string, search = ''): string | undefined {
  let target: string | undefined;
  runInNewContext(script, {
    window: { location: { pathname, search, replace: (url: string) => { target = url; } } },
  });
  return target;
}

describe('GitHub Pages 404 redirect', () => {
  it('moves a path and query into the hash route', () => {
    expect(redirect('/docforum-web/patient/orders', '?tab=active'))
      .toBe('/docforum-web/#/patient/orders?tab=active');
  });

  it('does not redirect outside the project base or loop on the root', () => {
    expect(redirect('/docforum-web/')).toBeUndefined();
    expect(redirect('/docforum-web-evil/patient/orders')).toBeUndefined();
    expect(redirect('/other/patient/orders')).toBeUndefined();
  });

  it('keeps URL-like path content inside the hash', () => {
    expect(redirect('/docforum-web//evil.example/path'))
      .toBe('/docforum-web/#//evil.example/path');
  });
});
