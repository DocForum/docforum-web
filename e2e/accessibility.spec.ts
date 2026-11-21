import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { routes } from './routes';

type AllowEntry = { route: string; rule: string; target: string; issue: string };
const allowlist = JSON.parse(readFileSync(new URL('./axe-allowlist.json', import.meta.url), 'utf8')) as AllowEntry[];

// Record lists reflow into labelled cards below the breakpoint instead of
// requiring a second scroll axis (WCAG 1.4.10). These are the screens whose
// tables used to rely on `overflow-x: auto`. True analytics data grids (the
// insights charts' companion tables) are deliberately excluded: those are
// inherently two-dimensional and keep their horizontal scroll.
const reflowRoutes: ReadonlyArray<{ path: string; role: 'patient' | 'doctor' | 'facility' | 'admin' }> = [
  { path: '/admin/audit', role: 'admin' },
  { path: '/admin/audit?tab=access', role: 'admin' },
  { path: '/facility/payments', role: 'facility' },
];

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

// Issue #246: icon-only header controls meet the WCAG 2.5.8 minimum target
// size (24×24 CSS px) and have an accessible name, at desktop and phone widths.
const MIN_TARGET = 24;

test('forced colors keeps status badges and insight bars outlined', async ({ page, visit }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await visit('/patient', 'patient');
  const badge = page.locator('button[aria-label^="Notifications,"] [class*="badge"]').first();
  await expect(badge).toBeVisible();
  expect(await badge.evaluate((element) => getComputedStyle(element).borderStyle)).not.toBe('none');

  await visit('/doctor/insights', 'doctor');
  const bar = page.locator('svg rect').first();
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((element) => getComputedStyle(element).stroke)).not.toBe('none');
});

async function expectTarget(locator: import('@playwright/test').Locator, label: string) {
  await expect(locator, `${label} is visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} has a box`).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(MIN_TARGET);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(MIN_TARGET);
}

test('header icon controls meet the 24px target size (desktop)', async ({ page, visit }) => {
  await visit('/patient', 'patient');
  await expectTarget(page.getByRole('button', { name: /^Notifications, / }), 'Notification bell');
  await expectTarget(page.getByRole('combobox', { name: 'Language' }), 'Language switcher');
});

test('header icon controls meet the 24px target size (mobile)', async ({ page, visit }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/patient', 'patient');
  await expectTarget(page.getByRole('button', { name: /^Notifications, / }), 'Notification bell');
  await expectTarget(page.getByRole('combobox', { name: 'Language' }), 'Language switcher');
  const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });
  await expectTarget(toggle, 'Menu toggle');
  await toggle.click();
  const close = page.getByRole('button', { name: 'Close navigation menu' });
  await expectTarget(close, 'Drawer close');
  await expect(close.locator('svg')).toHaveAttribute('aria-hidden', 'true');
});

// Issue #239: at phone width the closed drawer is inert (its links can't be
// focused at all) and the open drawer is a modal dialog that Escape closes,
// returning focus to the toggle. Axe agrees at both states.
test('the mobile nav drawer is inert when closed and a modal dialog when open', async ({ page, visit }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/patient', 'patient');

  const drawer = page.locator('#mobile-drawer');
  await expect(drawer).toHaveAttribute('inert', '');

  // A closed drawer link cannot take focus, so it is not in the tab order.
  const reachedClosedDrawer = await page.evaluate(() => {
    const link = document.querySelector<HTMLElement>('#mobile-drawer a[href]');
    link?.focus();
    return document.activeElement === link;
  });
  expect(reachedClosedDrawer).toBe(false);

  const closedScan = await new AxeBuilder({ page }).analyze();
  expect(closedScan.violations.map((violation) => violation.id)).not.toContain('aria-hidden-focus');

  const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });
  await toggle.click();

  const dialog = page.getByRole('dialog', { name: 'Mobile navigation menu' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(
    await page.evaluate(() => Boolean(document.getElementById('mobile-drawer')?.contains(document.activeElement))),
  ).toBe(true);

  const openScan = await new AxeBuilder({ page }).analyze();
  expect(openScan.violations.map((violation) => violation.id)).not.toContain('aria-hidden-focus');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(toggle).toBeFocused();
});

// Issue #246: a new notification is announced once, politely; the count that
// was already there on load is not.
test('a new notification is announced in a polite live region', async ({ page, visit }) => {
  await visit('/patient', 'patient');
  const bell = page.getByRole('button', { name: /^Notifications, \d+ unread$/ });
  await expect(bell).toBeVisible();
  const before = Number((await bell.getAttribute('aria-label'))!.match(/(\d+) unread/)![1]);

  // Past the batching window: the initial count must not have been announced.
  await page.waitForTimeout(1000);
  await expect(page.getByText(/new notifications?\. \d+ unread\./)).toHaveCount(0);

  await page.getByRole('button', { name: 'MOCK API' }).click();
  await page.getByRole('button', { name: 'Simulate a new notification' }).click();

  await expect(bell).toHaveAccessibleName(`Notifications, ${before + 1} unread`);
  await expect(page.getByRole('status').filter({ hasText: '1 new notification.' })).toHaveText(
    `1 new notification. ${before + 1} unread.`,
  );
  await expect(page.getByRole('status').filter({ hasText: '1 new notification.' })).toHaveAttribute('aria-live', 'polite');
});

for (const { path, role } of reflowRoutes) {
  test(`${path} has no horizontal page scroll at 320px`, async ({ page, visit }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await visit(path, role);

    // Wait for the table (and therefore the reflow styling) to be present.
    await expect(page.locator('table').first()).toBeVisible();

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(
      widths.scroll,
      `${path} scrolls horizontally at 320px (scrollWidth ${widths.scroll} > clientWidth ${widths.client})`,
    ).toBeLessThanOrEqual(widths.client + 1);
  });
}
