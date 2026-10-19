import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { FeatureFlagsConsole } from './FeatureFlagsConsole';
import { FLAGS_KEY } from '../hooks/useFeatureFlags';
import { ApiError } from '../../../services/api-client';
import * as flagsService from '../../../services/feature-flags-service';
import * as auditService from '../../../services/audit-service';
import { useAuthStore } from '../../../store/auth-store';
import type { AuditEvent, FeatureFlag, Role } from '../../../types/models';

vi.mock('../../../services/feature-flags-service');
vi.mock('../../../services/audit-service');

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const ME = 'admin-1';
const OTHER_ADMIN = '9b8c7d6e-0000-4000-8000-000000000001';
const NEW_USER = '7a8b9c0d-1e2f-4a5b-9c6d-abcdef012345';

const WALLET: FeatureFlag = {
  id: 'flag-wallet',
  key: 'wallet_payments',
  description: 'Patients can pay from a linked Stellar wallet instead of custodial checkout.',
  kind: 'percentage',
  enabled: true,
  rolloutPercentage: 25,
  targeting: { roles: ['patient'], userIds: [] },
  createdAt: daysAgo(40),
  updatedAt: '2026-10-10T09:00:00.000Z',
};

const TWO_FACTOR: FeatureFlag = {
  id: 'flag-2fa',
  key: 'two_factor_enforcement',
  description: 'Require 2FA at sign-in for clinicians.',
  kind: 'boolean',
  enabled: false,
  rolloutPercentage: null,
  targeting: { roles: ['doctor'], userIds: [] },
  createdAt: daysAgo(10),
  updatedAt: '2026-10-08T09:00:00.000Z',
};

const SMS: FeatureFlag = {
  id: 'flag-sms',
  key: 'sms_notifications',
  description: 'Send appointment reminders by SMS.',
  kind: 'boolean',
  enabled: true,
  rolloutPercentage: null,
  targeting: { roles: [], userIds: [] },
  createdAt: daysAgo(30),
  updatedAt: '2026-10-12T09:00:00.000Z',
};

function auditEvent(entityId: string, actorUserId: string | null, createdAt: string): AuditEvent {
  return {
    id: `evt-${entityId}`,
    actorUserId,
    actorRole: actorUserId ? 'admin' : null,
    entityType: 'FeatureFlag',
    entityId,
    action: 'feature_flag.updated',
    fromState: null,
    toState: null,
    requestId: null,
    metadata: null,
    createdAt,
  };
}

const HISTORY = [auditEvent(SMS.id, ME, daysAgo(1)), auditEvent(WALLET.id, OTHER_ADMIN, daysAgo(2))];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: role === 'admin' ? ME : `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderConsole(path = '/admin/flags') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <FeatureFlagsConsole />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

const currentLocation = () => screen.getByTestId('location').textContent;
const cardFor = (key: string) => screen.getByRole('article', { name: key });
const switchFor = (key: string) => screen.getByRole('switch', { name: `${key} enabled` });
const visibleKeys = () => screen.queryAllByRole('article').map((card) => within(card).getByRole('heading').textContent);

/** Later list fetches never answer, so whatever the list shows after a save
 * comes from the cache — the optimistic entry or its rollback — and not from
 * a refetch quietly fixing things up. */
function freezeListRefetches() {
  vi.mocked(flagsService.listFeatureFlags).mockReturnValue(new Promise(() => {}));
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(flagsService.listFeatureFlags).mockReset();
  vi.mocked(flagsService.updateFeatureFlag).mockReset();
  vi.mocked(auditService.listAuditEvents).mockReset();
  vi.mocked(flagsService.listFeatureFlags).mockResolvedValue([WALLET, TWO_FACTOR, SMS]);
  vi.mocked(auditService.listAuditEvents).mockResolvedValue({ items: HISTORY, nextCursor: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('FeatureFlagsConsole — list', () => {
  it('lists flags by key with state, rollout percentage and targeting', async () => {
    renderConsole();

    await screen.findAllByRole('article');
    expect(visibleKeys()).toEqual(['sms_notifications', 'two_factor_enforcement', 'wallet_payments']);

    const wallet = cardFor('wallet_payments');
    expect(within(wallet).getByText('Rolling out')).toBeInTheDocument();
    expect(within(wallet).getByText('Percentage rollout')).toBeInTheDocument();
    expect(within(wallet).getByText('25%')).toBeInTheDocument();
    expect(within(wallet).getByText('On for 25% of patients.')).toBeInTheDocument();
    expect(within(wallet).getByText('Patient')).toBeInTheDocument();

    const twoFactor = cardFor('two_factor_enforcement');
    expect(within(twoFactor).getByText('Off')).toBeInTheDocument();
    expect(switchFor('two_factor_enforcement')).toHaveAttribute('aria-checked', 'false');
    expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows who changed each flag last and when, from one audit query', async () => {
    renderConsole();

    const wallet = await screen.findByRole('article', { name: 'wallet_payments' });
    await waitFor(() => expect(wallet).toHaveTextContent('Changed 2 days ago by admin 9b8c7d6e…'));
    expect(within(wallet).getByTitle(OTHER_ADMIN)).toBeInTheDocument();
    expect(cardFor('sms_notifications')).toHaveTextContent('Changed yesterday by you');
    expect(cardFor('two_factor_enforcement')).toHaveTextContent('No changes recorded since it was created');
    expect(within(wallet).getByRole('link', { name: 'History' })).toHaveAttribute(
      'href',
      '/admin/audit?entityType=FeatureFlag&entityId=flag-wallet',
    );

    expect(auditService.listAuditEvents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(auditService.listAuditEvents).mock.calls[0][0]).toEqual({ entityType: 'FeatureFlag', limit: 200 });
  });

  it('says when a flag’s last change is older than the loaded history', async () => {
    vi.mocked(auditService.listAuditEvents).mockResolvedValue({ items: HISTORY, nextCursor: 'more' });
    renderConsole();

    const twoFactor = await screen.findByRole('article', { name: 'two_factor_enforcement' });
    expect(await within(twoFactor).findByText('Last changed before the latest 200 flag changes.')).toBeInTheDocument();
  });

  it('still lists flags when the audit trail can’t be loaded', async () => {
    vi.mocked(auditService.listAuditEvents).mockRejectedValue(new ApiError('Server error', 500));
    renderConsole();

    const wallet = await screen.findByRole('article', { name: 'wallet_payments' });
    expect(await within(wallet).findByText(/Last change unavailable/)).toBeInTheDocument();
    expect(switchFor('wallet_payments')).toBeEnabled();
  });

  it("explains when docforum-core doesn't serve flags yet", async () => {
    vi.mocked(flagsService.listFeatureFlags).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await screen.findByRole('alert')).toHaveTextContent("doesn't serve feature flags yet (docforum-core#132)");
  });

  it('says so when there are no flags at all', async () => {
    vi.mocked(flagsService.listFeatureFlags).mockResolvedValue([]);
    renderConsole();

    expect(await screen.findByText('No feature flags are defined in this environment yet.')).toBeInTheDocument();
  });
});

describe('FeatureFlagsConsole — search and filter', () => {
  it('searches key and description, keeping the search in the URL', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'two factor');
    expect(visibleKeys()).toEqual(['two_factor_enforcement']);
    expect(currentLocation()).toBe('/admin/flags?q=two+factor');

    await user.clear(screen.getByRole('searchbox', { name: 'Search' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'stellar');
    expect(visibleKeys()).toEqual(['wallet_payments']);
  });

  it('filters by state and type, with counts, and clears back to everything', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    const states = screen.getByRole('group', { name: 'Filter by state' });
    expect(within(states).getByRole('button', { name: /Rolling out/ })).toHaveTextContent('1');

    await user.click(within(states).getByRole('button', { name: /^Off/ }));
    expect(visibleKeys()).toEqual(['two_factor_enforcement']);

    await user.click(within(states).getByRole('button', { name: /^All/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'boolean');
    expect(visibleKeys()).toEqual(['sms_notifications', 'two_factor_enforcement']);
    expect(currentLocation()).toBe('/admin/flags?kind=boolean');
    expect(screen.getByText('2 of 3 flags')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(visibleKeys()).toHaveLength(3);
    expect(currentLocation()).toBe('/admin/flags');
  });

  it('restores filters from a shared link and ignores values it does not know', async () => {
    renderConsole('/admin/flags?state=on&kind=nonsense');
    await screen.findAllByRole('article');

    expect(visibleKeys()).toEqual(['sms_notifications']);
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveValue('all');
  });

  it('says when nothing matches', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'no-such-flag');
    expect(screen.getByText('No flags match these filters.')).toBeInTheDocument();
  });
});

describe('FeatureFlagsConsole — toggling', () => {
  it('asks for confirmation, showing the change and who it reaches before and after', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(switchFor('sms_notifications'));
    const dialog = screen.getByRole('dialog', { name: 'Confirm change to sms_notifications' });
    const row = within(dialog).getByRole('row', { name: /Kill switch/ });
    expect(row).toHaveTextContent('Enabled');
    expect(row).toHaveTextContent('Disabled');
    expect(within(dialog).getByText('On for everyone.')).toBeInTheDocument();
    expect(within(dialog).getByText('Off for everyone.')).toBeInTheDocument();
    expect(within(dialog).getByText(/loses it as soon as you confirm/)).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Changed yesterday by you');

    // Nothing is sent, and nothing moves, until the admin confirms.
    expect(flagsService.updateFeatureFlag).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'true');
    expect(flagsService.updateFeatureFlag).not.toHaveBeenCalled();
  });

  it('flips the switch at once, sends only the change, then confirms', async () => {
    const user = userEvent.setup();
    const save = deferred<FeatureFlag>();
    vi.mocked(flagsService.updateFeatureFlag).mockReturnValue(save.promise);
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(switchFor('two_factor_enforcement'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm change' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Before docforum-core has answered.
    await waitFor(() => expect(switchFor('two_factor_enforcement')).toHaveAttribute('aria-checked', 'true'));
    expect(switchFor('two_factor_enforcement')).toBeDisabled();
    expect(within(cardFor('two_factor_enforcement')).getByText('Saving…')).toBeInTheDocument();
    expect(flagsService.updateFeatureFlag).toHaveBeenCalledWith(
      'two_factor_enforcement',
      { enabled: true, expectedUpdatedAt: TWO_FACTOR.updatedAt },
      'admin-token',
    );

    const saved = { ...TWO_FACTOR, enabled: true, updatedAt: '2026-10-18T12:00:00.000Z' };
    vi.mocked(flagsService.listFeatureFlags).mockResolvedValue([WALLET, saved, SMS]);
    save.resolve(saved);
    expect(await screen.findByText(/two_factor_enforcement saved\. On for doctors\./)).toBeInTheDocument();
    expect(switchFor('two_factor_enforcement')).toBeEnabled();
    expect(switchFor('two_factor_enforcement')).toHaveAttribute('aria-checked', 'true');
  });

  it('rolls the switch back when the save fails', async () => {
    const user = userEvent.setup();
    const save = deferred<FeatureFlag>();
    vi.mocked(flagsService.updateFeatureFlag).mockReturnValue(save.promise);
    renderConsole();
    await screen.findAllByRole('article');
    freezeListRefetches();

    await user.click(switchFor('sms_notifications'));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Turn off' }));
    await waitFor(() => expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'false'));
    expect(within(cardFor('sms_notifications')).getByText('Off')).toBeInTheDocument();

    save.reject(new TypeError('Failed to fetch'));

    await waitFor(() => expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'true'));
    expect(within(cardFor('sms_notifications')).getByText('On')).toBeInTheDocument();
    expect(switchFor('sms_notifications')).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn’t confirm the change to sms_notifications, so it has been rolled back/);
    // And the real state is re-read rather than trusted.
    expect(flagsService.listFeatureFlags).toHaveBeenCalledTimes(2);
  });

  it('rolls back only the flag that failed, not another save in flight', async () => {
    const user = userEvent.setup();
    const walletSave = deferred<FeatureFlag>();
    const smsSave = deferred<FeatureFlag>();
    vi.mocked(flagsService.updateFeatureFlag).mockImplementation((key) =>
      key === 'wallet_payments' ? walletSave.promise : smsSave.promise,
    );
    renderConsole();
    await screen.findAllByRole('article');
    freezeListRefetches();

    await user.click(within(cardFor('wallet_payments')).getByRole('button', { name: 'Edit' }));
    const percentage = screen.getByRole('spinbutton', { name: 'Rollout percentage' });
    await user.clear(percentage);
    await user.type(percentage, '50');
    await user.click(screen.getByRole('button', { name: 'Review change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));

    await user.click(switchFor('sms_notifications'));
    await user.click(screen.getByRole('button', { name: 'Turn off' }));
    await waitFor(() => expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'false'));

    smsSave.reject(new ApiError('Conflict', 409));
    await waitFor(() => expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'true'));

    const wallet = cardFor('wallet_payments');
    expect(within(wallet).getByText('50%')).toBeInTheDocument();
    expect(within(wallet).getByText('Saving…')).toBeInTheDocument();

    walletSave.resolve({ ...WALLET, rolloutPercentage: 50, updatedAt: '2026-10-18T12:00:00.000Z' });
    await waitFor(() => expect(within(wallet).queryByText('Saving…')).not.toBeInTheDocument());
    expect(within(wallet).getByText('50%')).toBeInTheDocument();
  });

  it('explains a conflict and shows the latest server state', async () => {
    const user = userEvent.setup();
    vi.mocked(flagsService.updateFeatureFlag).mockRejectedValue(new ApiError('Flag was modified', 409));
    renderConsole();
    await screen.findAllByRole('article');
    // Someone else already turned it off.
    vi.mocked(flagsService.listFeatureFlags).mockResolvedValue([
      WALLET,
      TWO_FACTOR,
      { ...SMS, enabled: false, updatedAt: '2026-10-18T11:00:00.000Z' },
    ]);

    await user.click(switchFor('sms_notifications'));
    await user.click(screen.getByRole('button', { name: 'Turn off' }));

    expect(await screen.findByText(/was changed by someone else after you opened it/)).toBeInTheDocument();
    await waitFor(() => expect(switchFor('sms_notifications')).toHaveAttribute('aria-checked', 'false'));
    expect(screen.getByRole('link', { name: 'View in audit trail' })).toHaveAttribute(
      'href',
      '/admin/audit?entityType=FeatureFlag&entityId=flag-sms',
    );
  });

  it('never writes flag data to the console', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const user = userEvent.setup();
    vi.mocked(flagsService.updateFeatureFlag).mockRejectedValue(new ApiError('Server error', 500));
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(switchFor('sms_notifications'));
    await user.click(screen.getByRole('button', { name: 'Turn off' }));
    await screen.findByRole('alert');

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('FeatureFlagsConsole — editing', () => {
  async function openEdit(user: ReturnType<typeof userEvent.setup>, key = 'wallet_payments') {
    await screen.findAllByRole('article');
    await user.click(within(cardFor(key)).getByRole('button', { name: 'Edit' }));
    return screen.getByRole('dialog', { name: `Edit ${key}` });
  }

  it.each([
    ['101', 'The rollout can’t be above 100%.'],
    ['-5', 'The rollout can’t be below 0%.'],
    ['12.5', 'Use a whole number from 0 to 100.'],
    ['', 'Enter a percentage from 0 to 100.'],
  ])('refuses a rollout of %j before anything is sent', async (value, message) => {
    const user = userEvent.setup();
    renderConsole();
    const dialog = await openEdit(user);

    const percentage = within(dialog).getByRole('spinbutton', { name: 'Rollout percentage' });
    await user.clear(percentage);
    if (value) await user.type(percentage, value);
    await user.click(within(dialog).getByRole('button', { name: 'Review change' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(message);
    expect(percentage).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog', { name: /Confirm change/ })).not.toBeInTheDocument();
    expect(flagsService.updateFeatureFlag).not.toHaveBeenCalled();
  });

  it('refuses allowlist entries that are not user ids', async () => {
    const user = userEvent.setup();
    renderConsole();
    const dialog = await openEdit(user);

    await user.type(within(dialog).getByRole('textbox', { name: 'User allowlist' }), 'jane@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Review change' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Not a user id: “jane@example.com”');
  });

  it('says when nothing has changed', async () => {
    const user = userEvent.setup();
    renderConsole();
    const dialog = await openEdit(user);

    await user.click(within(dialog).getByRole('button', { name: 'Review change' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Nothing has changed yet.');
  });

  it('reviews percentage, roles and allowlist changes together and saves them', async () => {
    const user = userEvent.setup();
    vi.mocked(flagsService.updateFeatureFlag).mockImplementation(async (_key, input) => ({
      ...WALLET,
      rolloutPercentage: input.rolloutPercentage ?? WALLET.rolloutPercentage,
      targeting: input.targeting ?? WALLET.targeting,
      updatedAt: '2026-10-18T12:00:00.000Z',
    }));
    renderConsole();
    const dialog = await openEdit(user);

    const percentage = within(dialog).getByRole('spinbutton', { name: 'Rollout percentage' });
    await user.clear(percentage);
    await user.type(percentage, '50');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Doctor' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'User allowlist' }), NEW_USER.toUpperCase());
    await user.click(within(dialog).getByRole('button', { name: 'Review change' }));

    const review = screen.getByRole('dialog', { name: 'Confirm change to wallet_payments' });
    expect(within(review).getByRole('row', { name: /Rollout/ })).toHaveTextContent('25%50%');
    expect(within(review).getByRole('row', { name: /Roles/ })).toHaveTextContent('patientspatients and doctors');
    expect(within(review).getByRole('row', { name: /Allowlist/ })).toHaveTextContent('Nobody1 userAdds 7a8b9c0d…');
    expect(within(review).getByText('On for 25% of patients.')).toBeInTheDocument();
    expect(within(review).getByText('On for 50% of patients and doctors, plus 1 allowlisted user.')).toBeInTheDocument();

    // Back to edit keeps what was typed.
    await user.click(within(review).getByRole('button', { name: 'Edit details' }));
    expect(screen.getByRole('spinbutton', { name: 'Rollout percentage' })).toHaveValue(50);
    await user.click(screen.getByRole('button', { name: 'Review change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm change' }));

    expect(flagsService.updateFeatureFlag).toHaveBeenCalledWith(
      'wallet_payments',
      {
        rolloutPercentage: 50,
        targeting: { roles: ['patient', 'doctor'], userIds: [NEW_USER] },
        expectedUpdatedAt: WALLET.updatedAt,
      },
      'admin-token',
    );
    expect(
      await screen.findByText(/wallet_payments saved\. On for 50% of patients and doctors, plus 1 allowlisted user\./),
    ).toBeInTheDocument();
  });

  it('warns and blocks saving when someone else changes the flag mid-edit', async () => {
    const user = userEvent.setup();
    const queryClient = renderConsole();
    const dialog = await openEdit(user);

    queryClient.setQueryData<FeatureFlag[]>(FLAGS_KEY, [
      { ...WALLET, rolloutPercentage: 80, updatedAt: '2026-10-18T11:00:00.000Z' },
      TWO_FACTOR,
      SMS,
    ]);

    expect(await within(dialog).findByText('Someone else changed this flag while you had it open.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Review change' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Start again from the latest' }));
    expect(within(dialog).queryByText(/Someone else changed this flag/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: 'Rollout percentage' })).toHaveValue(80);
  });

  it('closes on Escape and returns focus to the button that opened it', async () => {
    const user = userEvent.setup();
    renderConsole();
    await openEdit(user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(cardFor('wallet_payments')).getByRole('button', { name: 'Edit' })).toHaveFocus();
  });

  it('hides the percentage field for on/off flags', async () => {
    const user = userEvent.setup();
    renderConsole();
    const dialog = await openEdit(user, 'sms_notifications');

    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /Enabled/ })).toBeChecked();
  });
});

describe('/admin/flags route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/flags']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Feature flags' })).toBeInTheDocument();
  });

  it.each<Role>(['patient', 'doctor', 'facility'])('redirects a %s away without fetching anything', async (role) => {
    signIn(role);
    renderApp();

    await waitFor(() => expect(currentLocation()).toBe(`/${role}`));
    expect(screen.queryByRole('heading', { name: 'Feature flags' })).not.toBeInTheDocument();
    expect(flagsService.listFeatureFlags).not.toHaveBeenCalled();
  });
});
