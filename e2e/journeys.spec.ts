import { test, expect } from './fixtures';

test('patient can move from dashboard to care history and facility discovery', async ({ page, visit }) => {
  await visit('/patient');
  await page.getByRole('link', { name: 'Care journey timeline' }).click();
  await expect(page.getByRole('heading', { name: 'Care journey timeline' })).toBeVisible();
  await expect(page.getByText('Demo cough consult (fake)').first()).toBeVisible();
  await page.goto('/?previewRole=patient#/patient/facilities');
  await expect(page.getByRole('heading', { name: 'Find pharmacies & diagnostic labs' })).toBeVisible();
  await expect(page.getByText('Demo Pharmacy (fake)').first()).toBeVisible();
});

test('patient sees a recoverable server error and a delayed response', async ({ page, visit }) => {
  await visit('/patient/facilities');
  await page.getByRole('button', { name: 'MOCK API' }).click();
  await page.getByRole('button', { name: 'errors' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /something went wrong/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'normal', exact: true }).click();
  await expect(page.getByText('Demo Pharmacy (fake)').first()).toBeVisible();
  await page.getByLabel('Response latency').fill('1000');
  await page.getByRole('button', { name: 'Reset data' }).click();
  await expect(page.getByText('Demo Pharmacy (fake)').first()).toBeVisible();
});

test('patient facility search retries a one-time network failure', async ({ page, visit }) => {
  type FacilityState = { requests?: number; failNext?: boolean };
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    const state = window as Window & FacilityState;
    state.requests = 0;
    state.failNext = false;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (new URL(url).pathname === '/facilities') {
        state.requests = (state.requests ?? 0) + 1;
        if (state.failNext) {
          state.failNext = false;
          return Promise.reject(new TypeError('Failed to fetch'));
        }
      }
      return original(input, init);
    };
  });
  await visit('/patient/facilities');
  await expect(page.getByText('Demo Pharmacy (fake)').first()).toBeVisible();
  await page.evaluate(() => {
    const state = window as Window & FacilityState;
    state.requests = 0;
    state.failNext = true;
  });
  await page.getByRole('button', { name: 'MOCK API' }).click();
  await page.getByRole('button', { name: 'normal', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & FacilityState).requests)).toBe(2);
  await expect(page.getByText('Demo Pharmacy (fake)').first()).toBeVisible();
});

test('doctor can start a queued visit and sign its consultation note', async ({ page, visit }) => {
  await visit('/doctor', 'doctor');
  const row = page.getByRole('table').first().getByRole('row', { name: /Quinn Example/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Start' }).click();
  await expect(row.getByText('In progress')).toBeVisible();
  await page.goto('/?previewRole=doctor#/doctor/consultation/apt-demo-2');
  await expect(page.getByRole('heading', { name: 'Consultation note' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign and lock' }).first().click();
  await page.getByRole('button', { name: 'Sign and lock' }).click();
  await expect(page.getByText('Signed · locked')).toBeVisible();
});

test('facility fulfills a pending order with attribution', async ({ page, visit }) => {
  await visit('/facility', 'facility');
  const item = page.locator('[class*="queueItem"]').filter({ hasText: 'Demo Amoxicillin 500mg (fake)' }).first();
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Dispense & Fulfill' }).click();
  await expect(item.getByText('Fulfilled', { exact: true })).toBeVisible();
  await expect(item.getByLabel('Action attribution')).toContainText('Frank Facility (fake)');
});

test('admin creates, funds and releases exactly one payment intent', async ({ page, visit }) => {
  const calls: string[] = [];
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if ((init?.method ?? 'GET') !== 'GET' && url.includes('/payments/intents')) {
        (window as Window & { __paymentCalls?: string[] }).__paymentCalls?.push(`${init?.method ?? 'GET'} ${new URL(url).pathname}`);
      }
      return original(input, init);
    };
    (window as Window & { __paymentCalls?: string[] }).__paymentCalls = [];
  });
  await visit('/admin', 'admin');
  await page.getByRole('textbox', { name: 'Order id' }).fill('ord-example-1');
  await page.getByRole('textbox', { name: 'Patient profile id' }).fill('prf-patient-demo');
  await page.getByRole('textbox', { name: 'Facility id' }).fill('fac-demo-pharmacy');
  await page.getByRole('textbox', { name: 'Amount (stroops)' }).fill('100000000');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fund escrow' })).toBeVisible();
  await page.getByRole('button', { name: 'Fund escrow' }).click();
  await expect(page.getByRole('button', { name: 'Release to facility' })).toBeVisible();
  await page.getByRole('button', { name: 'Release to facility' }).click();
  await expect(page.getByText('released', { exact: true })).toBeVisible();
  calls.push(...await page.evaluate(() => (window as Window & { __paymentCalls?: string[] }).__paymentCalls ?? []));
  expect(calls).toHaveLength(3);
  expect(calls[0]).toBe('POST /payments/intents');
  expect(calls[1]).toMatch(/^POST \/payments\/intents\/pin-mock-\d+\/fund$/);
  expect(calls[2]).toMatch(/^POST \/payments\/intents\/pin-mock-\d+\/release$/);
});

for (const role of ['patient', 'doctor', 'facility'] as const) {
  test(`${role} cannot open admin console`, async ({ page, visit }) => {
    await visit('/admin', role);
    await expect(page).toHaveURL(new RegExp(`#/${role}$`));
    await expect(page.getByRole('heading', { name: /payments console/i })).toHaveCount(0);
  });
}
