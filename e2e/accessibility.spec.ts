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
