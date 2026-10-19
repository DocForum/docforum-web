import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { DisputesConsole } from './DisputesConsole';
import { ApiError } from '../../../services/api-client';
import * as disputesService from '../../../services/admin-disputes-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FulfillmentDisputeSummary, Role } from '../../../types/models';

vi.mock('../../../services/admin-disputes-service');

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const OLDER: FulfillmentDisputeSummary = {
  id: 'dsp-older',
  orderId: 'ord-rx-1',
  orderType: 'prescription',
  orderItemName: 'Amoxicillin 500 mg capsules (30)',
  patientName: 'Pat Placeholder',
  facilityId: 'fac-1',
  facilityName: 'Central Pharmacy',
  amountStroops: '500000000',
  asset: 'XLM',
  status: 'open',
  openedAt: hoursAgo(8 * 24),
  updatedAt: '2026-10-16T11:30:00.000Z',
  reportExcerpt: 'The label says 250 mg but my prescription is for 500 mg.',
  attachmentCount: 2,
};

const NEWER: FulfillmentDisputeSummary = {
  ...OLDER,
  id: 'dsp-newer',
  orderId: 'ord-lab-2',
  orderType: 'lab',
  orderItemName: 'Fasting lipid panel',
  patientName: 'Sam Example',
  amountStroops: '250000000',
  openedAt: hoursAgo(50),
  updatedAt: '2026-10-18T09:00:00.000Z',
  reportExcerpt: 'No results have appeared and my appointment is tomorrow.',
  attachmentCount: 1,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderConsole() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/disputes']}>
        <DisputesConsole />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(disputesService.listOpenDisputes).mockReset();
  // Deliberately out of order — the console sorts every loaded page by age.
  vi.mocked(disputesService.listOpenDisputes).mockResolvedValue({
    items: [NEWER, OLDER],
    nextCursor: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('DisputesConsole — queue', () => {
  it('lists open disputes oldest first with order, facility, amount, age and report', async () => {
    renderConsole();

    const cards = await screen.findAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Amoxicillin 500 mg capsules (30)',
      'Fasting lipid panel',
    ]);
    expect(within(cards[0]).getByText('Open 8 days')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Central Pharmacy')).toBeInTheDocument();
    expect(within(cards[0]).getByText('50 XLM')).toBeInTheDocument();
    expect(within(cards[0]).getByText(/label says 250 mg/)).toBeInTheDocument();
    expect(within(cards[0]).getByText('2 attachments')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Open 2 d 2 h')).toBeInTheDocument();
    expect(within(cards[1]).getByText('25 XLM')).toBeInTheDocument();
    expect(within(cards[1]).queryByText('Prescription')).not.toBeInTheDocument();
    expect(within(cards[1]).getByText('Lab order')).toBeInTheDocument();

    expect(within(cards[0]).getByRole('link', { name: /Review dispute/ })).toHaveAttribute(
      'href',
      '/admin/disputes/dsp-older',
    );
    expect(screen.getByText(/2 open disputes loaded · oldest open for 8 days/)).toBeInTheDocument();
    expect(disputesService.listOpenDisputes).toHaveBeenCalledWith(null, 'admin-token', expect.anything());
  });

  it('loads the next page on request', async () => {
    const user = userEvent.setup();
    vi.mocked(disputesService.listOpenDisputes).mockImplementation(async (cursor) =>
      cursor === 'page-2'
        ? { items: [NEWER], nextCursor: null }
        : { items: [OLDER], nextCursor: 'page-2' },
    );
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says so when nothing is holding escrow', async () => {
    vi.mocked(disputesService.listOpenDisputes).mockResolvedValue({ items: [], nextCursor: null });
    renderConsole();

    expect(await screen.findByText(/No open disputes/)).toBeInTheDocument();
  });

  it("explains when docforum-core doesn't serve the queue yet", async () => {
    vi.mocked(disputesService.listOpenDisputes).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't serve the disputes queue yet/);
  });
});

describe('/admin/disputes route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/disputes']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins and linked from the admin navigation', async () => {
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Fulfilment disputes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Disputes' })).toHaveAttribute('href', '/admin/disputes');
  });

  it.each<Role>(['patient', 'doctor', 'facility'])(
    'redirects a %s away without fetching anything',
    async (role) => {
      signIn(role);
      renderApp();

      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(`/${role}`));
      expect(screen.queryByRole('heading', { name: 'Fulfilment disputes' })).not.toBeInTheDocument();
      expect(disputesService.listOpenDisputes).not.toHaveBeenCalled();
    },
  );
});
