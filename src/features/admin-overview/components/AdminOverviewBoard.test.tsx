import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminOverviewBoard } from './AdminOverviewBoard';
import { ApiError } from '../../../services/api-client';
import * as adminOverviewService from '../../../services/admin-overview-service';
import { useAuthStore } from '../../../store/auth-store';
import { REFRESH_INTERVAL_MS } from '../sections';
import type { AdminOverview } from '../../../types/models';

vi.mock('../../../services/admin-overview-service');

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
// Fixtures are built once at import, so future times get slack built in.
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const OVERVIEW: AdminOverview = {
  generatedAt: ago(5_000),
  sections: [
    { key: 'verifications', label: 'Doctor verifications', available: true, count: 0, oldestItemCreatedAt: null },
    { key: 'stuck_referrals', label: 'Stuck referrals', available: true, count: 3, oldestItemCreatedAt: ago(2 * 24 * HOUR) },
    { key: 'unrouted_orders', label: 'Unrouted orders', available: true, count: 1, oldestItemCreatedAt: ago(3 * HOUR) },
    { key: 'stuck_payments', label: 'Stuck payments', available: true, count: 2, oldestItemCreatedAt: ago(30 * HOUR) },
    { key: 'failed_jobs', label: 'Failed jobs', available: false, count: null, oldestItemCreatedAt: null },
    { key: 'open_disputes', label: 'Open disputes', available: true, count: 1, oldestItemCreatedAt: ago(5 * MINUTE) },
    // A queue key from a backend registry entry this frontend never saw.
    { key: 'tomorrows_queue', label: 'Tomorrow’s queue', available: true, count: 4, oldestItemCreatedAt: null },
  ],
};

function signIn() {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: 'admin-1', email: 'admin@docforum.org', role: 'admin', createdAt: '', updatedAt: '' },
  });
}

function renderBoard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminOverviewBoard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const card = (name: string) => screen.getByRole('article', { name });

async function loaded() {
  await screen.findByRole('article', { name: 'Stuck referrals' });
}

beforeEach(() => {
  signIn();
  vi.mocked(adminOverviewService.getAdminOverview).mockReset().mockResolvedValue(OVERVIEW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('AdminOverviewBoard — cards', () => {
  it('shows one card per queue with its count, oldest age and drill-down', async () => {
    renderBoard();
    await loaded();

    const queues = screen.getAllByTestId('queue-card');
    expect(queues).toHaveLength(OVERVIEW.sections.length);

    const referrals = card('Stuck referrals');
    expect(within(referrals).getByText('3')).toBeInTheDocument();
    expect(within(referrals).getByText('2 days')).toBeInTheDocument();
    expect(within(referrals).getByRole('link', { name: 'Open the referrals console' })).toHaveAttribute(
      'href',
      '/admin/referrals',
    );
    expect(referrals).toHaveAttribute('data-tone', 'warning');

    const payments = card('Stuck payments');
    expect(within(payments).getByText('2')).toBeInTheDocument();
    expect(within(payments).getByText('30 hours')).toBeInTheDocument();
    expect(within(payments).getByRole('link', { name: 'Open the payments console' })).toHaveAttribute(
      'href',
      '/admin/payments/console',
    );

    const disputes = card('Open disputes');
    expect(within(disputes).getByRole('link', { name: 'Open the disputes queue' })).toHaveAttribute(
      'href',
      '/admin/disputes',
    );
  });

  it('calls an empty queue clear instead of a problem', async () => {
    renderBoard();
    await loaded();

    const verifications = card('Doctor verifications');
    expect(within(verifications).getByText('0')).toBeInTheDocument();
    expect(within(verifications).getByText('Nothing waiting')).toBeInTheDocument();
    expect(verifications).toHaveAttribute('data-tone', 'ok');
    // No screen exists for this queue yet, so there is nothing to open.
    expect(within(verifications).queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders an unavailable queue as a muted card, not an error', async () => {
    renderBoard();
    await loaded();

    const jobs = card('Failed jobs');
    expect(within(jobs).getByText('Unavailable')).toBeInTheDocument();
    expect(within(jobs).getByText(/couldn't answer for this queue/)).toBeInTheDocument();
    expect(jobs).toHaveAttribute('data-tone', 'neutral');
    // The drill-down is a frontend route, still valid while the data is not.
    expect(within(jobs).getByRole('link', { name: 'Open system health' })).toBeInTheDocument();
    // One bad section never replaces the board.
    expect(screen.getAllByTestId('queue-card')).toHaveLength(OVERVIEW.sections.length);
  });

  it('shows a future registry key as sent, without inventing a link', async () => {
    renderBoard();
    await loaded();

    const unknown = card('Tomorrow’s queue');
    expect(within(unknown).getByText('4')).toBeInTheDocument();
    expect(within(unknown).getByText('Oldest age not reported')).toBeInTheDocument();
    expect(within(unknown).queryByRole('link')).not.toBeInTheDocument();
  });

  it('refreshes on demand from the header button', async () => {
    const user = userEvent.setup();
    renderBoard();
    await loaded();
    expect(adminOverviewService.getAdminOverview).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => expect(adminOverviewService.getAdminOverview).toHaveBeenCalledTimes(2));
  });
});

describe('AdminOverviewBoard — failure states', () => {
  it('shows a muted notice when the endpoint is not served yet, not an error page', async () => {
    vi.mocked(adminOverviewService.getAdminOverview).mockRejectedValue(new ApiError('Not Found', 404));

    renderBoard();

    expect(await screen.findByText(/doesn't serve the operations overview yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('queue-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the last board with a stale banner when a refresh fails', async () => {
    const user = userEvent.setup();
    renderBoard();
    await loaded();

    vi.mocked(adminOverviewService.getAdminOverview).mockRejectedValue(new ApiError('Gone', 410));
    await user.click(screen.getByRole('button', { name: 'Refresh now' }));

    expect(await screen.findByText(/Couldn't refresh — showing the board from/)).toBeInTheDocument();
    expect(screen.getAllByTestId('queue-card')).toHaveLength(OVERVIEW.sections.length);
  });

  it('says so plainly when the board comes back with no queues at all', async () => {
    vi.mocked(adminOverviewService.getAdminOverview).mockResolvedValue({ generatedAt: ago(1_000), sections: [] });

    renderBoard();

    expect(await screen.findByText('docforum-core reported no queues yet.')).toBeInTheDocument();
  });
});

describe('AdminOverviewBoard — auto-refresh', () => {
  const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  };

  const callCount = () => vi.mocked(adminOverviewService.getAdminOverview).mock.calls.length;

  beforeEach(() => {
    // Only the polling interval is faked; everything else keeps real time.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    setVisibility('visible');
  });

  it('polls every minute while the tab is visible', async () => {
    renderBoard();
    await loaded();
    expect(callCount()).toBe(1);

    act(() => vi.advanceTimersByTime(REFRESH_INTERVAL_MS));

    await vi.waitFor(() => expect(callCount()).toBe(2));
    expect(screen.getByText(/Refreshes every 60 seconds while this tab is visible/)).toBeInTheDocument();
  });

  it('stops polling while the tab is hidden and catches up when it comes back', async () => {
    renderBoard();
    await loaded();

    setVisibility('hidden');
    await act(async () => {
      vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 3);
    });
    expect(callCount()).toBe(1);

    setVisibility('visible');
    // React Query listens on window, as browsers bubble the event there.
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    await vi.waitFor(() => expect(callCount()).toBe(2));
  });
});
