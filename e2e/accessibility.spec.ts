import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { routes } from './routes';

type AllowEntry = { route: string; rule: string; target: string; issue: string };
const allowlist = JSON.parse(readFileSync(new URL('./axe-allowlist.json', import.meta.url), 'utf8')) as AllowEntry[];

for (const { path, role } of routes) {
  test(`${path} has no new axe violations`, async ({ page, visit }, testInfo) => {
    await visit(path, role);
    await expect(page.locator('main h1, main h2, #root h1, #root h2').first()).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    const violations = result.violations.flatMap((violation) =>
      violation.nodes.map((node) => ({ route: path, rule: violation.id, target: node.target.join(' '), issue: '' })),
    );
    if (process.env.AXE_DUMP_DIR) {
      mkdirSync(process.env.AXE_DUMP_DIR, { recursive: true });
      writeFileSync(`${process.env.AXE_DUMP_DIR}/${encodeURIComponent(path)}.json`, JSON.stringify(violations));
    }
    const known = allowlist.filter((entry) => entry.route === path);
    const newViolations = violations.filter((violation) => !known.some((entry) =>
      entry.rule === violation.rule && entry.target === violation.target && /^https:\/\/github\.com\/DocForum\/docforum-web\/issues\/\d+$/.test(entry.issue),
    ));
    await testInfo.attach('axe-results', {
      body: JSON.stringify({ violations: result.violations, incomplete: result.incomplete }, null, 2),
      contentType: 'application/json',
    });
    expect(newViolations, `New axe violations on ${path}`).toEqual([]);
  });
}

// Issue #238: one meaningful <h1> per route. The app shell used to add a
// second, route-derived <h1> ("Doctor · Apt Demo 2") on top of the page's own.
for (const { path, role } of routes) {
  test(`${path} has exactly one h1, without a raw id`, async ({ page, visit }) => {
    await visit(path, role);
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(h1, `Expected exactly one <h1> on ${path}`).toHaveCount(1);

    const text = (await h1.textContent())?.trim() ?? '';
    expect(text, `<h1> on ${path} is empty`).not.toBe('');
    // Dynamic route segments (fixture ids such as "apt-demo-2") must not leak
    // into the heading, raw or title-cased.
    for (const segment of path.split('/').filter((s) => /\d/.test(s))) {
      const titled = segment.replace(/[-_]/g, ' ').toLowerCase();
      expect(text.toLowerCase(), `<h1> on ${path} contains the id "${segment}"`).not.toContain(segment.toLowerCase());
      expect(text.toLowerCase(), `<h1> on ${path} contains the id "${segment}"`).not.toContain(titled);
    }
    const id = await h1.getAttribute('id');
    if (id !== null) expect(id, `<h1> id on ${path} is not a valid token`).toMatch(/^\S+$/);
  });
}
