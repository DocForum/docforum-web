import { expect, test } from '@playwright/test';

// Smoke test against a REAL docforum-core + Postgres (issue #12). Nothing is
// mocked: the signup/login/reload/logout requests hit the backend process
// started by playwright.config.ts.
//
// Scope is deliberately small — one happy-path journey, not coverage.
test('sign up, stay signed in on reload, log out, log back in', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
  const password = 'e2e-password-123';

  // --- Sign up ------------------------------------------------------------
  await page.goto('/#/signup');
  await page.getByLabel('Full name').fill('E2E Placeholder');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Signup succeeds → home, signed in. The email only appears in the user
  // chip once the session exists (the "Log out" button is always rendered).
  await expect(page.getByText(email).first()).toBeVisible();

  // --- Protected page + reload restores the session (#9) ------------------
  await page.goto('/#/patient');
  await expect(page.getByText(email).first()).toBeVisible();

  await page.reload();

  // The boot refresh must sign this user back in instead of bouncing to
  // /login. Wait for the restoring state to clear, then assert the guard
  // kept us on the protected route.
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page).toHaveURL(/#\/patient/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toHaveCount(0);

  // --- Log out, and a reload must NOT restore the session -----------------
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page).toHaveURL(/#\/login/);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page).toHaveURL(/#\/login/);

  // --- Log back in with the account just created --------------------------
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText(email).first()).toBeVisible();
});
