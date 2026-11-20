import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from './fixtures';

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
      if (new URL(url).pathname === '/facilities/eligible') {
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
  // The layout's page header and the note itself both title the page
  // "Consultation note"; wait for the note's own editor rather than either.
  await expect(page.getByRole('textbox', { name: 'Consultation note content' })).toBeVisible();
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

// Facility owner setup journey (issue #293): price version → API key →
// webhook → staff invite, asserting the exact writes and that a one-time
// secret really is gone once the dialog is closed.
type CapturedWindow = Window & { __ownerSetupCalls?: string[]; __demoteMembers?: boolean };

/**
 * Records every non-GET request to the owner-only endpoints from inside the
 * page. Init scripts re-run on each navigation, so the buffer is drained
 * after every step instead of read once at the end.
 */
function recordOwnerWrites(page: Page, options: { demoteToStaff?: boolean } = {}): void {
  if (options.demoteToStaff) {
    void page.addInitScript(() => {
      (window as CapturedWindow).__demoteMembers = true;
    });
  }
  void page.addInitScript(() => {
    // Declared inside the script on purpose: an init script is serialized and
    // evaluated in the page, so it cannot see this file's module scope.
    const ownerWritePath = /^\/facilities\/[^/]+\/(prices|api-keys|webhooks|invites)$/;
    const original = window.fetch.bind(window);
    const state = window as CapturedWindow;
    state.__ownerSetupCalls = [];
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? 'GET';
      const path = new URL(url).pathname;
      if (state.__demoteMembers && method === 'GET' && path.endsWith('/members')) {
        // Stand in for a facility whose signed-in member is staff, not owner:
        // the mock API is not modified, the response is rewritten here.
        return original(input, init).then(async (response) => {
          const members = (await response.json()) as { role: string }[];
          return new Response(JSON.stringify(members.map((m) => ({ ...m, role: 'staff' }))), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      }
      if (method !== 'GET' && ownerWritePath.test(path)) {
        state.__ownerSetupCalls?.push(`${method} ${path}`);
      }
      return original(input, init);
    };
  });
}

async function drainOwnerWrites(page: Page): Promise<string[]> {
  const calls = await page.evaluate(
    () => (window as CapturedWindow).__ownerSetupCalls ?? [],
  );
  await page.evaluate(() => {
    (window as CapturedWindow).__ownerSetupCalls = [];
  });
  return calls;
}

async function expectNoAxeViolations(page: Page, step: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const found = violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id} → ${node.target.join(' ')}`),
  );
  expect(found, `axe violations at ${step}`).toEqual([]);
}

test('facility owner sets a price, creates an API key and a webhook, and invites staff', async ({
  page,
  visit,
}) => {
  // Four screens, four axe analyses and four dialogs: 39.6s on an idle machine
  // against the 60s default, and it crosses that under the load a full
  // Playwright run puts on it. slow() raises this test's budget only.
  test.slow();
  recordOwnerWrites(page);
  const writes: string[] = [];

  await visit('/facility/settings', 'facility');
  await expect(page.getByRole('heading', { name: 'Price list' })).toBeVisible();
  await page.getByLabel('Search catalog items').fill('Amoxicillin');
  await page.getByRole('button', { name: 'Search catalog' }).click();
  // Scoped to the matched catalog row so the "Set price" button is picked by
  // item code, not by position in the result list.
  const catalogRow = page.getByRole('listitem').filter({ hasText: 'MED-AMOX-500' });
  await expect(catalogRow).toHaveCount(1);
  await catalogRow.getByRole('button', { name: 'Set price' }).click();
  await expect(page.getByRole('heading', { name: /Amoxicillin 500mg/ })).toBeVisible();
  await page.getByLabel(/Price per unit \(XLM\)/).fill('12.5');
  await page.getByLabel('Effective from').fill('2026-12-01T09:00');
  await page.getByRole('button', { name: 'Add price version' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'New price version saved' })).toBeVisible();
  await expectNoAxeViolations(page, 'the saved price version');
  writes.push(...(await drainOwnerWrites(page)));

  await page.goto('/?previewRole=facility#/facility/integrations');
  // This screen carries both the "Facility · Integrations" page title and an
  // "Integrations" panel heading, so the match has to be exact.
  await expect(page.getByRole('heading', { name: 'Integrations', exact: true })).toBeVisible();
  // The seeded membership marks the signed-in facility member as owner, so the
  // owner-only panels are the ones on screen.
  await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
  await page.getByRole('button', { name: 'Create key' }).click();
  const keyDialog = page.getByRole('dialog', { name: 'Create API key' });
  await page.getByLabel('Key name').fill('Lab LIS integration');
  await keyDialog.getByRole('button', { name: 'Create key' }).click();
  const createdKey = page.getByRole('dialog', { name: 'API key created' });
  await expect(createdKey.getByText('it will never be shown again')).toBeVisible();
  const keySecret = (await createdKey.getByText(/^df_live_/).textContent()) ?? '';
  expect(keySecret).toMatch(/^df_live_/);
  await expectNoAxeViolations(page, 'the one-time API key secret');
  await createdKey.getByRole('button', { name: 'I have saved the secret' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Shown once: the secret is gone from the DOM, and the list only ever carries
  // the prefix, so the key cannot be recovered from the screen afterwards.
  await expect(page.getByText(keySecret, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Lab LIS integration')).toBeVisible();
  await expectNoAxeViolations(page, 'the API key list after closing');

  await page.getByRole('button', { name: 'Add endpoint' }).click();
  // A URL the seeded endpoint does not already use, so finding it in the list
  // proves this journey's endpoint was the one stored.
  const url = 'https://lis.example.test/docforum/hooks';
  await page.getByLabel('Endpoint URL').fill(url);
  await page.getByRole('dialog', { name: 'Add webhook endpoint' })
    .getByRole('checkbox', { name: 'payment.released' })
    .check();
  await page.getByRole('dialog', { name: 'Add webhook endpoint' })
    .getByRole('button', { name: 'Create endpoint' })
    .click();
  const createdHook = page.getByRole('dialog', { name: 'Webhook endpoint created' });
  const signingSecret = (await createdHook.getByText(/^whsec_/).textContent()) ?? '';
  expect(signingSecret).toMatch(/^whsec_/);
  await createdHook.getByRole('button', { name: 'I have saved the secret' }).click();
  await expect(page.getByText(signingSecret, { exact: true })).toHaveCount(0);
  await expect(page.getByText(url)).toBeVisible();
  writes.push(...(await drainOwnerWrites(page)));

  await page.goto('/?previewRole=facility#/facility/team');
  await expect(page.getByRole('heading', { name: 'Facility team & accounts' })).toBeVisible();
  await page.getByRole('button', { name: '+ Invite staff member' }).click();
  await expectNoAxeViolations(page, 'the invite dialog');
  // Not an email the fixtures already have pending, so the row below can only
  // be the invite this journey sent.
  const invitedEmail = 'locum.tech@example.test';
  await page.getByLabel('Email address').fill(invitedEmail);
  await page.getByLabel('Role').selectOption('staff');
  await page.getByRole('dialog', { name: 'Invite team member' })
    .getByRole('button', { name: 'Send invite' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(invitedEmail, { exact: true })).toBeVisible();
  writes.push(...(await drainOwnerWrites(page)));
  await expectNoAxeViolations(page, 'the pending invitations list');

  expect(writes).toEqual([
    'POST /facilities/fac-main/prices',
    'POST /facilities/fac-main/api-keys',
    'POST /facilities/fac-main/webhooks',
    'POST /facilities/fac-main/invites',
  ]);
});

test('facility staff who is not an owner gets no owner-only controls', async ({ page, visit }) => {
  recordOwnerWrites(page, { demoteToStaff: true });
  await visit('/facility/integrations', 'facility');
  await expect(page.getByText('Integrations are available to facility owners only')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create key' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add endpoint' })).toHaveCount(0);

  await page.goto('/?previewRole=facility#/facility/team');
  await expect(page.getByText('Staff Member View (Read-only):')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Invite staff member' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pending invitations' })).toHaveCount(0);
});

for (const role of ['patient', 'doctor', 'facility'] as const) {
  test(`${role} cannot open admin console`, async ({ page, visit }) => {
    await visit('/admin', role);
    await expect(page).toHaveURL(new RegExp(`#/${role}$`));
    await expect(page.getByRole('heading', { name: /payments console/i })).toHaveCount(0);
  });
}
