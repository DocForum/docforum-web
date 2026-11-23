import { test, expect, type Role } from './fixtures';

/**
 * Landscape phone/tablet mount coverage (WCAG 1.3.4, issue #240).
 *
 * The installed app no longer locks to portrait, so the key screens must be
 * usable at 740x360: no horizontal overflow, and the compact drawer
 * navigation is in use instead of a wrapped desktop bar.
 */
const screens: ReadonlyArray<{ name: string; path: string; role: Role; heading: RegExp }> = [
  { name: 'login', path: '/login', role: 'patient', heading: /welcome back|log in/i },
  { name: 'patient home', path: '/patient', role: 'patient', heading: /attention|patient/i },
  { name: 'doctor queue', path: '/doctor', role: 'doctor', heading: /doctor|queue/i },
  { name: 'facility verify', path: '/facility/verify', role: 'facility', heading: /verify/i },
];

for (const screen of screens) {
  test(`${screen.name} fits a 740x360 landscape viewport`, async ({ page, visit }) => {
    await visit(screen.path, screen.role);

    await expect(page.locator('#root h1, #root h2').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector('main');
      const header = document.querySelector('header[role="banner"]');
      return {
        width: window.innerWidth,
        root: root.scrollWidth - root.clientWidth,
        main: main ? main.scrollWidth - main.clientWidth : 0,
        header: header ? header.scrollWidth - header.clientWidth : 0,
      };
    });

    expect(overflow.root).toBeLessThanOrEqual(1);
    expect(overflow.main).toBeLessThanOrEqual(1);
    expect(overflow.header).toBeLessThanOrEqual(1);
  });
}

test('the drawer navigation replaces the desktop bar in landscape', async ({ page, visit }) => {
  await visit('/patient', 'patient');

  const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});
