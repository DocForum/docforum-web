import { test as base, expect, type Page } from '@playwright/test';

export type Role = 'patient' | 'doctor' | 'facility' | 'admin';

export const test = base.extend<{
  visit: (route: string, role?: Role) => Promise<void>;
}>({
  visit: async ({ page }, use) => {
    // Default screenshots to the light theme without clobbering an explicit
    // choice: the theme projects set their own value in an init script, and
    // which script runs first is not guaranteed.
    await page.addInitScript(() => {
      if (!localStorage.getItem('docforum-theme')) localStorage.setItem('docforum-theme', 'light');
    });
    await use(async (route, role = 'patient') => {
      await page.goto(`/?previewRole=${role}#${route}`);
      await expect(page.locator('#root')).not.toBeEmpty();
      // Routes are lazy chunks with loaders (#112). The mock panel mounts as
      // soon as MSW is up, but the page itself appears only once its chunk
      // (hundreds of unbundled modules on a cold Vite dev server) and its
      // guard/prefetch have finished — wait for the real page, not the panel.
      await expect(page.locator('#main-content')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('#main-content .routeFallback')).toHaveCount(0, { timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Hide', exact: true })).toBeVisible();
      if (route === '/') {
        await page.getByRole('button', { name: 'Sign out' }).evaluate((button: HTMLButtonElement) => button.click());
        await page.getByRole('link', { name: 'DocForum' }).click();
        await expect(page).toHaveURL(/#\/$/);
      }
      await page.getByRole('button', { name: 'Hide', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('[data-reveal]')).every(
          (element) => getComputedStyle(element).opacity === '1',
        ),
      );
    });
  },
});

export { expect };
export type { Page };
