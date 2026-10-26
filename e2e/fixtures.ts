import { test as base, expect, type Page } from '@playwright/test';

export type Role = 'patient' | 'doctor' | 'facility' | 'admin';

export const test = base.extend<{
  visit: (route: string, role?: Role) => Promise<void>;
}>({
  visit: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('docforum-theme', 'light'));
    await use(async (route, role = 'patient') => {
      await page.goto(`/?previewRole=${role}#${route}`);
      await expect(page.locator('#root')).not.toBeEmpty();
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
