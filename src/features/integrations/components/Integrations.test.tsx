import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '../../../test/render';
import { IntegrationsView } from './IntegrationsView';
import { ApiKeysPanel, DEFAULT_MOCK_API_KEYS } from './ApiKeysPanel';
import { WebhooksPanel, DEFAULT_MOCK_WEBHOOKS } from './WebhooksPanel';
import { DEFAULT_MOCK_DELIVERIES } from './WebhookDeliveries';
import { useAuthStore } from '../../../store/auth-store';
import * as integrationsService from '../../../services/integrations-service';
import * as facilityTeamService from '../../../services/facility-team-service';
import { DEFAULT_MOCK_MEMBERS } from '../../facility-team/components/FacilityTeamView';
import type { CreatedApiKey, CreatedWebhookEndpoint } from '../../../types/models';

vi.mock('../../../services/integrations-service');
vi.mock('../../../services/facility-team-service');

const createdKey: CreatedApiKey = {
  ...DEFAULT_MOCK_API_KEYS[0],
  id: 'key-new',
  name: 'New integration key',
  prefix: 'df_live_newkey12',
  secret: 'df_live_newkey12-super-secret-value',
};

function CacheProbe({ clientRef }: { clientRef: { current: QueryClient | null } }) {
  clientRef.current = useQueryClient();
  return null;
}

function cacheContains(client: QueryClient, value: string): boolean {
  const queries = client
    .getQueryCache()
    .getAll()
    .map((query) => JSON.stringify(query.state.data ?? null));
  const mutations = client
    .getMutationCache()
    .getAll()
    .map((mutation) => JSON.stringify(mutation.state.data ?? null));
  return [...queries, ...mutations].join(' ').includes(value);
}

const createdEndpoint: CreatedWebhookEndpoint = {
  ...DEFAULT_MOCK_WEBHOOKS[0],
  id: 'wh-new',
  url: 'https://new.example.test/webhooks/docforum',
  secretPrefix: 'whsec_newsecret',
  signingSecret: 'whsec_newsecret-super-secret-value',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'test-token',
    user: {
      id: 'user-owner-1',
      email: 'frank.facility@example.test',
      role: 'facility',
      createdAt: '',
      updatedAt: '',
    },
  });

  vi.mocked(integrationsService.listApiKeys).mockResolvedValue(DEFAULT_MOCK_API_KEYS);
  vi.mocked(integrationsService.createApiKey).mockResolvedValue(createdKey);
  vi.mocked(facilityTeamService.listFacilityMembers).mockResolvedValue(DEFAULT_MOCK_MEMBERS);
  vi.mocked(facilityTeamService.listFacilityInvites).mockResolvedValue([]);
  vi.mocked(integrationsService.revokeApiKey).mockResolvedValue({
    success: true,
    keyId: DEFAULT_MOCK_API_KEYS[0].id,
  });
  vi.mocked(integrationsService.listWebhookEndpoints).mockResolvedValue(DEFAULT_MOCK_WEBHOOKS);
  vi.mocked(integrationsService.createWebhookEndpoint).mockResolvedValue(createdEndpoint);
  vi.mocked(integrationsService.deleteWebhookEndpoint).mockResolvedValue({
    success: true,
    endpointId: DEFAULT_MOCK_WEBHOOKS[0].id,
  });
  vi.mocked(integrationsService.listWebhookDeliveries).mockResolvedValue(DEFAULT_MOCK_DELIVERIES);
  vi.mocked(integrationsService.sendTestDelivery).mockResolvedValue({
    ...DEFAULT_MOCK_DELIVERIES[0],
    id: 'del-test',
  });
  vi.mocked(integrationsService.redeliverWebhook).mockResolvedValue({
    deliveryId: DEFAULT_MOCK_DELIVERIES[1].id,
    status: 'success',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('Integrations — API keys', () => {
  it('renders the key list with prefix, created and last-used columns', async () => {
    render(<ApiKeysPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^api keys$/i });

    expect(screen.getByText('Lab Information System')).toBeInTheDocument();
    expect(screen.getByText(/df_live_a1b2c3d4/)).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows the secret exactly once on creation and drops it when the dialog closes', async () => {
    render(<ApiKeysPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^api keys$/i });
    await userEvent.click(screen.getByRole('button', { name: /create key/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/key name/i), 'New integration key');
    await userEvent.click(within(dialog).getByRole('button', { name: /^create key$/i }));

    // Secret is displayed after creation, with a one-time warning.
    expect(await screen.findByText(createdKey.secret)).toBeInTheDocument();
    expect(screen.getByText(/will never be shown again/i)).toBeInTheDocument();

    // Closing the dialog removes the secret from the DOM.
    await userEvent.click(
      screen.getByRole('button', { name: /i have saved the secret/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText(createdKey.secret)).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Nothing secretly persisted to storage.
    const stored = JSON.stringify({ ...localStorage, ...sessionStorage });
    expect(stored).not.toContain(createdKey.secret);
  });

  it('drops the key secret from React Query caches once the dialog closes', async () => {
    const clientRef: { current: QueryClient | null } = { current: null };

    render(
      <>
        <CacheProbe clientRef={clientRef} />
        <ApiKeysPanel facilityId="fac-main" />
      </>,
    );

    await screen.findByRole('heading', { name: /^api keys$/i });
    await userEvent.click(screen.getByRole('button', { name: /create key/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/key name/i), 'New integration key');
    await userEvent.click(within(dialog).getByRole('button', { name: /^create key$/i }));

    expect(await screen.findByText(createdKey.secret)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /i have saved the secret/i }),
    );

    await waitFor(() => {
      expect(cacheContains(clientRef.current!, createdKey.secret)).toBe(false);
    });
  });

  it('revokes a key after confirmation', async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmSpy);

    render(<ApiKeysPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^api keys$/i });
    const rows = screen.getAllByRole('row');
    const firstKeyRow = rows.find((row) =>
      within(row).queryByText('Lab Information System'),
    )!;

    await userEvent.click(
      within(firstKeyRow).getByRole('button', { name: /^revoke$/i }),
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('Revoke "Lab Information System"'),
    );
    await waitFor(() => {
      expect(integrationsService.revokeApiKey).toHaveBeenCalledWith(
        'fac-main',
        DEFAULT_MOCK_API_KEYS[0].id,
        'test-token',
      );
    });
  });

  it('does not revoke when the confirmation is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));

    render(<ApiKeysPanel facilityId="fac-main" />);
    await screen.findByRole('heading', { name: /^api keys$/i });

    const rows = screen.getAllByRole('row');
    const firstKeyRow = rows.find((row) =>
      within(row).queryByText('Lab Information System'),
    )!;
    await userEvent.click(
      within(firstKeyRow).getByRole('button', { name: /^revoke$/i }),
    );

    expect(integrationsService.revokeApiKey).not.toHaveBeenCalled();
  });

  it('does not show a created secret before creation', async () => {
    render(<ApiKeysPanel facilityId="fac-main" />);
    await screen.findByRole('heading', { name: /^api keys$/i });
    await userEvent.click(screen.getByRole('button', { name: /create key/i }));

    expect(screen.queryByText(createdKey.secret)).not.toBeInTheDocument();
    expect(screen.queryByText(/will never be shown again/i)).not.toBeInTheDocument();
  });
});

describe('Integrations — Webhooks', () => {
  it('renders endpoints with events and signed-secret prefix', async () => {
    render(<WebhooksPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^webhooks$/i });
    expect(
      screen.getByText('https://lab.example.test/webhooks/docforum'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Secret: whsec_a1b2/)).toBeInTheDocument();
    expect(screen.getByText('order.created')).toBeInTheDocument();
  });

  it('shows the signing secret once, then drops it on close', async () => {
    render(<WebhooksPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^webhooks$/i });
    await userEvent.click(screen.getByRole('button', { name: /add endpoint/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText(/endpoint url/i),
      'https://new.example.test/webhooks/docforum',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: /create endpoint/i }),
    );

    expect(await screen.findByText(createdEndpoint.signingSecret)).toBeInTheDocument();
    expect(screen.getByText(/will never be shown again/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /i have saved the secret/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText(createdEndpoint.signingSecret)).not.toBeInTheDocument();
    });
  });

  it('drops the signing secret from React Query caches once the dialog closes', async () => {
    const clientRef: { current: QueryClient | null } = { current: null };

    render(
      <>
        <CacheProbe clientRef={clientRef} />
        <WebhooksPanel facilityId="fac-main" />
      </>,
    );

    await screen.findByRole('heading', { name: /^webhooks$/i });
    await userEvent.click(screen.getByRole('button', { name: /add endpoint/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText(/endpoint url/i),
      'https://new.example.test/webhooks/docforum',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: /create endpoint/i }),
    );

    expect(await screen.findByText(createdEndpoint.signingSecret)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /i have saved the secret/i }),
    );

    await waitFor(() => {
      expect(cacheContains(clientRef.current!, createdEndpoint.signingSecret)).toBe(false);
    });
  });

  it('sends a test event and opens delivery history', async () => {
    render(<WebhooksPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^webhooks$/i });
    await userEvent.click(screen.getByRole('button', { name: /send test/i }));

    await waitFor(() => {
      expect(integrationsService.sendTestDelivery).toHaveBeenCalledWith(
        'fac-main',
        DEFAULT_MOCK_WEBHOOKS[0].id,
        'test-token',
      );
    });
    expect(await screen.findByText(/recent deliveries/i)).toBeInTheDocument();
  });

  it('redelivers a failed delivery', async () => {
    render(<WebhooksPanel facilityId="fac-main" />);

    await screen.findByRole('heading', { name: /^webhooks$/i });
    await userEvent.click(
      screen.getByRole('button', { name: /recent deliveries/i }),
    );

    await screen.findByText('Recent deliveries');
    await userEvent.click(screen.getByRole('button', { name: /^redeliver$/i }));

    await waitFor(() => {
      expect(integrationsService.redeliverWebhook).toHaveBeenCalledWith(
        'fac-main',
        DEFAULT_MOCK_WEBHOOKS[0].id,
        DEFAULT_MOCK_DELIVERIES[1].id,
        'test-token',
      );
    });
  });

  it('deletes an endpoint after confirmation', async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmSpy);

    render(<WebhooksPanel facilityId="fac-main" />);
    await screen.findByRole('heading', { name: /^webhooks$/i });
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(integrationsService.deleteWebhookEndpoint).toHaveBeenCalledWith(
        'fac-main',
        DEFAULT_MOCK_WEBHOOKS[0].id,
        'test-token',
      );
    });
  });
});

describe('Integrations — access', () => {
  it('renders the page heading and docs link for facility users', async () => {
    render(<IntegrationsView facilityId="fac-main" />);

    expect(await screen.findByRole('heading', { name: /^integrations$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /integration docs/i })).toHaveAttribute(
      'href',
      'https://github.com/DocForum/docforum-core/blob/main/docs/api/README.md',
    );
    // Owner sees the management panels.
    expect(await screen.findByRole('heading', { name: /^api keys$/i })).toBeInTheDocument();
    expect(screen.queryByText(/available to facility owners only/i)).not.toBeInTheDocument();
  });

  it('shows an owner-only notice and hides panels for staff', async () => {
    vi.mocked(facilityTeamService.listFacilityMembers).mockResolvedValue([
      { ...DEFAULT_MOCK_MEMBERS[0], email: 'someone.else@example.test', isCurrentUser: false },
      { ...DEFAULT_MOCK_MEMBERS[1], email: 'frank.facility@example.test', role: 'staff', isCurrentUser: true },
    ]);

    render(<IntegrationsView facilityId="fac-main" />);

    expect(
      await screen.findByText(/available to facility owners only/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^api keys$/i })).not.toBeInTheDocument();
  });

  it('shows a notice for non-facility roles', async () => {
    useAuthStore.setState({
      accessToken: 'test-token',
      user: {
        id: 'user-patient',
        email: 'pat.placeholder@example.test',
        role: 'patient',
        createdAt: '',
        updatedAt: '',
      },
    });

    render(<IntegrationsView facilityId="fac-main" />);

    expect(
      await screen.findByText(/available to facility owners only/i),
    ).toBeInTheDocument();
  });
});
