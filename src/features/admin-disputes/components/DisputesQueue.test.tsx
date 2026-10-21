import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DisputesQueue } from './DisputesQueue';
import { ApiError } from '../../../services/api-client';
import * as disputesService from '../../../services/disputes-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FulfillmentDisputeSummary, Role } from '../../../types/models';

vi.mock('../../../services/disputes-service');

function signIn(role: Role = 'admin') {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function dispute(overrides: Partial<FulfillmentDisputeSummary> & Pick<FulfillmentDisputeSummary, 'id'>) {
  return {
    status: 'open',
    orderId: `ord-${overrides.id}`,
    orderType: 'prescription',
    itemName: 'Demo item',
    patientName: 'Pat Placeholder',
    facility: { id: 'fac-1', name: 'Demo Pharmacy (fake)' },
    amountStroops: '500000000',
    asset: 'XLM',
    reason: 'not_received',
    openedAt: '2026-10-14T08:15:00.000Z',
    updatedAt: '2026-10-15T10:20:00.000Z',
    ...overrides,
  } satisfies FulfillmentDisputeSummary;
}

const OLDER = dispute({ id: 'dsp-older', itemName: 'Amoxicillin 500mg', openedAt: '2026-10-10T08:00:00.000Z' });
const NEWER = dispute({
  id: 'dsp-newer',
  itemName: 'Demo blood panel',
  orderType: 'lab_order',
  reason: 'incomplete',
  openedAt: '2026-10-19T11:30:00.000Z',
  amountStroops: '250000000',
});

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/disputes']}>
        <DisputesQueue />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const cards = () => screen.getAllByRole('article');
const cardHeadings = () =>
  cards().map((card) => within(card).getByRole('heading', { level: 2 }).textContent ?? '');

describe('DisputesQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
  });

  it('lists open disputes oldest first with facility, amount and reason', async () => {
    vi.mocked(disputesService.listDisputes).mockResolvedValue({ items: [NEWER, OLDER], nextCursor: null });

    renderQueue();

    await screen.findByRole('heading', { name: /Amoxicillin 500mg/ });
    expect(cardHeadings()[0]).toContain('Amoxicillin 500mg');
    expect(cardHeadings()[1]).toContain('Demo blood panel');

    const olderCard = cards()[0];
    expect(within(olderCard).getByText('Demo Pharmacy (fake)')).toBeInTheDocument();
    expect(within(olderCard).getByText('50 XLM')).toBeInTheDocument();
    expect(within(olderCard).getByText('Not received')).toBeInTheDocument();
    expect(within(olderCard).getByText(/Open \d/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Amoxicillin 500mg/ })).toHaveAttribute(
      'href',
      '/admin/disputes/dsp-older',
    );
    expect(within(olderCard).getByRole('link', { name: 'Review dispute' })).toHaveAttribute(
      'href',
      '/admin/disputes/dsp-older',
    );
    expect(disputesService.listDisputes).toHaveBeenCalledWith(
      { status: 'open', cursor: null },
      'admin-token',
      expect.any(AbortSignal),
    );
  });

  it('loads older pages and keeps the whole loaded set sorted by age', async () => {
    vi.mocked(disputesService.listDisputes)
      .mockResolvedValueOnce({ items: [NEWER], nextCursor: '1' })
      .mockResolvedValueOnce({ items: [OLDER], nextCursor: null });
    const user = userEvent.setup();

    renderQueue();

    await screen.findByRole('heading', { name: /Demo blood panel/ });
    expect(cards()).toHaveLength(1);
    expect(screen.getByText(/1\+ open disputes/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load older disputes' }));

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(cardHeadings()[0]).toContain('Amoxicillin 500mg');
    expect(cardHeadings()[1]).toContain('Demo blood panel');
    expect(disputesService.listDisputes).toHaveBeenLastCalledWith(
      { status: 'open', cursor: '1' },
      'admin-token',
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole('button', { name: 'Load older disputes' })).not.toBeInTheDocument();
  });

  it('says so when nothing is stuck rather than showing an empty list', async () => {
    vi.mocked(disputesService.listDisputes).mockResolvedValue({ items: [], nextCursor: null });

    renderQueue();

    expect(await screen.findByText(/No open disputes/)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('explains a lost admin session and offers a retry', async () => {
    vi.mocked(disputesService.listDisputes)
      .mockRejectedValueOnce(new ApiError('Forbidden', 403))
      .mockResolvedValueOnce({ items: [OLDER], nextCursor: null });
    const user = userEvent.setup();

    renderQueue();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no longer has admin access/i);

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: /Amoxicillin 500mg/ })).toBeInTheDocument();
  });
});
