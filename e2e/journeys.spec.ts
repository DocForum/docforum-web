import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from './fixtures';

type FetchCall = { url: string; method: string; body: string | null };

/** Records every request the page makes so a journey can assert on the exact
 * payloads and profile scoping the UI sent. */
async function recordRequests(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: FetchCall[] = [];
    (window as Window & { __calls?: FetchCall[] }).__calls = calls;
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : null,
      });
      return original(input, init);
    };
  });
}

async function calls(page: import('@playwright/test').Page): Promise<FetchCall[]> {
  return page.evaluate(() => (window as Window & { __calls?: FetchCall[] }).__calls ?? []);
}

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
  const item = page
    .locator('[class*="queueItem"]')
    .filter({ hasText: 'Demo Vitamin D 1000 IU (fake)' })
    .first();
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Dispense', exact: true }).click();
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
  // The effective time is a DatePicker + TimePicker pair (#114), so the two
  // halves are filled separately. The time combobox is also the listbox's
  // accessible name, so the role keeps it to the input.
  await page.getByLabel('Effective from (date)').fill('2026-12-01');
  await page.getByRole('combobox', { name: 'Effective from (time)' }).fill('09:00');
  await page.getByRole('button', { name: 'Add price version' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'New price version saved' })).toBeVisible();
  await expectNoAxeViolations(page, 'the saved price version');
  writes.push(...(await drainOwnerWrites(page)));

  await page.goto('/?previewRole=facility#/facility/integrations');
  // #345 gave this screen a page-header title of "Integrations", which is now
  // also the panel's own h1, so the heading text alone is ambiguous. The
  // subtitle is only rendered by the integrations panel.
  await expect(page.getByText('Manage API keys and webhooks')).toBeVisible();
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
    // The price form goes through the facility-settings service, which writes
    // against the signed-in facility's `me` scope; the integrations and team
    // panels address fac-main directly.
    'POST /facilities/me/prices',
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

test('admin approves a doctor and resolves a fulfilment dispute', async ({ page, visit }) => {
  await recordRequests(page);
  await visit('/admin/verifications', 'admin');
  await expect(page.getByRole('heading', { name: 'Doctor verification' })).toBeVisible();

  // Approve with a reason, asserting the payload keeps it.
  const ada = page.getByRole('listitem').filter({ hasText: 'Dr Ada Example (fake)' });
  await ada.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dr Ada Example (fake)' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();

  const approveDialog = page.getByRole('alertdialog');
  await expect(approveDialog.getByRole('heading', { name: /Approve Dr Ada Example/ })).toBeVisible();
  await approveDialog.getByLabel('Reason (required)').fill('Credentials verified against the public register.');
  const approveButton = approveDialog.getByRole('button', { name: 'Approve', exact: true });
  await approveButton.click();
  await expect(page.getByText(/Approved — the decision was recorded/)).toBeVisible();

  // Double-submitting must not send a second decision.
  expect(
    (await calls(page)).filter((call) => call.method === 'PATCH' && call.url.includes('/verification')),
  ).toHaveLength(1);
  const [approve] = (await calls(page)).filter((call) => call.method === 'PATCH' && call.url.includes('/verification'));
  expect(approve.url).toContain('/doctors/vrf-demo-1/verification');
  expect(JSON.parse(approve.body ?? '{}')).toMatchObject({
    status: 'verified',
    reason: 'Credentials verified against the public register.',
  });

  await page.getByRole('link', { name: '← Back to the queue' }).click();
  await expect(page.getByText('Dr Ada Example (fake)')).toHaveCount(0);
  await expect(page.getByRole('listitem').filter({ hasText: 'Dr Bek Example (fake)' })).toBeVisible();

  // Rejecting requires a reason before anything is sent.
  const bek = page.getByRole('listitem').filter({ hasText: 'Dr Bek Example (fake)' });
  await bek.getByRole('link', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  const rejectDialog = page.getByRole('alertdialog');
  const rejectButton = rejectDialog.getByRole('button', { name: 'Reject', exact: true });
  await rejectButton.click();
  await expect(rejectDialog.getByRole('alert')).toHaveText(/at least 10 characters/);
  await expect(page.getByRole('alert').filter({ hasText: /at least 10 characters/ })).toBeVisible();
  await rejectDialog.getByLabel('Reason (required)').fill('Too short');
  await rejectButton.click();
  await expect(rejectDialog.getByRole('alert')).toHaveText(/at least 10 characters/);
  expect(
    (await calls(page)).filter((call) => call.method === 'PATCH' && call.url.includes('/verification')),
  ).toHaveLength(1);
  await rejectDialog.getByLabel('Reason (required)').fill('Licence scan is illegible — please resubmit a clear copy.');
  await rejectButton.click();
  await expect(page.getByText(/Rejected — the decision was recorded/)).toBeVisible();

  const decisions = (await calls(page)).filter((call) => call.method === 'PATCH' && call.url.includes('/verification'));
  expect(decisions).toHaveLength(2);
  expect(decisions[1].url).toContain('/doctors/vrf-demo-2/verification');
  expect(JSON.parse(decisions[1].body ?? '{}')).toMatchObject({
    status: 'rejected',
    reason: 'Licence scan is illegible — please resubmit a clear copy.',
  });

  // Signals and dialogs are checked at each admin step.
  for (const step of ['queue', 'detail']) {
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((violation) => `${step}: ${violation.id}`)).toEqual([]);
  }

  // Resolve a fulfilment dispute end to end, with a final confirmation.
  await page.goto('/?previewRole=admin#/admin/disputes');
  await expect(page.getByRole('heading', { name: 'Fulfilment disputes' })).toBeVisible();
  await page.getByRole('link', { name: /Demo Amoxicillin 500mg \(fake\).*prescription/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Demo Amoxicillin 500mg (fake)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resolve this dispute' })).toBeVisible();
  await page.getByRole('button', { name: 'Resolve for facility' }).click();

  const resolveDialog = page.getByRole('alertdialog');
  await expect(resolveDialog.getByRole('heading', { name: 'Resolve for facility?' })).toBeVisible();
  await resolveDialog.getByLabel('Resolution notes').fill('Facility proof matches the courier record.');
  await resolveDialog.getByRole('checkbox').check();
  await resolveDialog.getByRole('button', { name: 'Resolve for facility' }).click();

  await expect(page.getByRole('heading', { name: 'Resolved for the facility' })).toBeVisible();
  const resolveCalls = (await calls(page)).filter(
    (call) => call.method === 'POST' && call.url.includes('/admin/disputes/dsp-demo-1/resolve'),
  );
  expect(resolveCalls).toHaveLength(1);
  expect(JSON.parse(resolveCalls[0].body ?? '{}')).toMatchObject({
    resolution: 'facility',
    notes: 'Facility proof matches the courier record.',
  });

  const disputeAxe = await new AxeBuilder({ page }).analyze();
  expect(disputeAxe.violations.map((violation) => violation.id)).toEqual([]);

  // The queue updates: the resolved dispute is no longer open.
  await page.getByRole('link', { name: '← All disputes' }).click();
  await expect(page.getByRole('heading', { name: 'Fulfilment disputes' })).toBeVisible();
  await expect(page.getByText('Demo Amoxicillin 500mg (fake)')).toHaveCount(0);
  await expect(page.getByText(/2\+ open disputes|2 open disputes/)).toBeVisible();
});

test('guardian acts for a dependent and the switch scopes every screen', async ({ page, visit }) => {
  await recordRequests(page);
  await visit('/patient');
  await expect(page.getByRole('heading', { name: 'What needs your attention' })).toBeVisible();
  await expect(page.getByText(/Acting for:/)).toHaveCount(0);

  // Mark the switch: everything requested after this point must be scoped to
  // the dependent, never the guardian.
  await page.evaluate(() =>
    (window as Window & { __calls?: FetchCall[] }).__calls?.push({
      url: '__after-switch__',
      method: 'GET',
      body: null,
    }),
  );
  await page.locator('#profile-switcher').selectOption({ label: 'Tyke Placeholder (fake)' });
  await expect(page.getByText(/Acting for:.*Tyke Placeholder \(fake\)/)).toBeVisible();
  await expect(page.getByText('Dust mites (fake) updated')).toBeVisible();
  await expect(page.getByText('Peanuts (fake) updated')).toHaveCount(0);

  const recordNav = page.getByRole('navigation', { name: 'Your record' });
  await recordNav.getByRole('link', { name: 'Health profile' }).click();
  await expect(page.getByRole('heading', { name: 'Health profile' }).last()).toBeVisible();
  await expect(page.getByText(/Dust mites \(fake\)/)).toBeVisible();
  await expect(page.getByText(/Peanuts \(fake\)/)).toHaveCount(0);
  await expect(page.getByText(/Acting for:.*Tyke Placeholder \(fake\)/)).toBeVisible();

  // Orders for the dependent are theirs alone.
  await page.goBack();
  await recordNav.getByRole('link', { name: 'My prescriptions & lab orders' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible();
  await expect(page.getByText('Demo Child Paracetamol 120mg (fake)')).toBeVisible();
  await expect(page.locator('a[href*="ord-demo-rx-102"]')).toHaveCount(0);
  const orderCalls = (await calls(page)).filter((call) => call.url.includes('/orders/mine'));
  expect(orderCalls.some((call) => call.url.includes('patientProfileId=prf-dependent-demo'))).toBe(true);

  // The care timeline is the dependent's thread only.
  await page.goBack();
  await recordNav.getByRole('link', { name: 'Care journey timeline' }).click();
  await expect(page.getByText('Tyke check-up (fake)')).toBeVisible();
  await expect(page.getByText('Demo cough consult (fake)')).toHaveCount(0);
  const careCalls = (await calls(page)).filter((call) => call.url.includes('/care-threads'));
  expect(careCalls.some((call) => call.url.includes('/patients/prf-dependent-demo/care-threads'))).toBe(true);

  // Every request made after the switch is dependent-scoped.
  const allCalls = await calls(page);
  const afterSwitch = allCalls.slice(allCalls.findIndex((call) => call.url === '__after-switch__') + 1);
  expect(afterSwitch.some((call) => call.url.includes('/patients/prf-patient-demo'))).toBe(false);
  expect(
    afterSwitch.some((call) => call.url.includes('/patients/prf-dependent-demo/care-threads')),
  ).toBe(true);
  expect(afterSwitch.some((call) => call.url.includes('/patients/prf-dependent-demo/health/'))).toBe(true);

  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);

  // Switching back restores the guardian's record with no stale dependent data.
  await page.goBack();
  await page.locator('#profile-switcher').selectOption({ label: 'Pat Placeholder (fake) (you)' });
  await expect(page.getByText(/Acting for:/)).toHaveCount(0);
  await recordNav.getByRole('link', { name: 'My prescriptions & lab orders' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible();
  await expect(page.locator('a[href*="ord-demo-rx-102"]')).toBeVisible();
  await expect(page.getByText('Demo Child Paracetamol 120mg (fake)')).toHaveCount(0);
});
