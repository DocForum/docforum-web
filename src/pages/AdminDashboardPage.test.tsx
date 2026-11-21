import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as overviewService from '../services/admin-overview-service';
import { ApiError } from '../services/api-client';
import type { OperationsOverview } from '../types/models';
import { render, screen } from '../test/render';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('../services/admin-overview-service');

const OVERVIEW: OperationsOverview = {
  generatedAt: '2026-11-19T12:00:00.000Z',
  queues: [
    {
      key: 'verifications',
      label: 'Doctor verifications',
      count: 3,
      oldestAt: '2026-11-17T12:00:00.000Z',
      href: '/admin/verifications',
      available: true,
    },
    {
      key: 'disputes',
      label: 'Fulfilment disputes',
      count: 0,
      oldestAt: null,
      href: '/admin/disputes',
      available: false,
      detail: 'The disputes service is not reporting right now.',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminDashboardPage (#68)', () => {
  it('renders one card per queue with count, oldest age and a drill-down link', async () => {
    vi.mocked(overviewService.getOperationsOverview).mockResolvedValue(OVERVIEW);
    render(<AdminDashboardPage />, { route: '/admin', role: 'admin' });

    expect(await screen.findByRole('heading', { name: 'Doctor verifications' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/oldest waiting: 2 days/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open doctor verifications/i })).toHaveAttribute(
      'href',
      '/admin/verifications',
    );
  });

  it('mutes an unavailable section instead of failing the page', async () => {
    vi.mocked(overviewService.getOperationsOverview).mockResolvedValue(OVERVIEW);
    render(<AdminDashboardPage />, { route: '/admin', role: 'admin' });

    expect(await screen.findByText(/not reporting right now/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Operations overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open fulfilment disputes anyway/i })).toHaveAttribute(
      'href',
      '/admin/disputes',
    );
  });

  it('keeps the individual consoles reachable when the overview endpoint is not served', async () => {
    vi.mocked(overviewService.getOperationsOverview).mockRejectedValue(new ApiError('not found', 404));
    render(<AdminDashboardPage />, { route: '/admin', role: 'admin' });

    expect(await screen.findByText(/isn't available on this deployment yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payments console' })).toHaveAttribute(
      'href',
      '/admin/payments/console',
    );
  });
});
