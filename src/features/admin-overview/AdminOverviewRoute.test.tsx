import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import * as adminOverviewService from '../../services/admin-overview-service';
import * as paymentsService from '../../services/payments-service';
import { useAuthStore } from '../../store/auth-store';
import type { AdminOverview, PaymentIntent, Role } from '../../types/models';

vi.mock('../../services/admin-overview-service');
vi.mock('../../services/payments-service');

const OVERVIEW: AdminOverview = {
  generatedAt: '2026-10-21T09:00:00.000Z',
  sections: [
    { key: 'open_disputes', label: 'Open disputes', available: true, count: 1, oldestItemCreatedAt: '2026-10-20T09:00:00.000Z' },
    { key: 'failed_jobs', label: 'Failed jobs', available: false, count: null, oldestItemCreatedAt: null },
  ],
};

const INTENT: PaymentIntent = {
  id: 'pi-42',
  orderType: 'prescription',
  orderId: 'ord-1',
  status: 'escrowed',
  patientProfileId: 'pp-1',
  facilityId: 'fac-1',
  amountStroops: '500000000',
  escrowId: 'esc-42 (fake)',
  stellarTxHash: null,
  sorobanContractId: null,
  createdAt: '2026-10-19T09:00:00.000Z',
  updatedAt: '2026-10-19T09:05:00.000Z',
};

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: `${role}-token`,
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(adminOverviewService.getAdminOverview).mockReset().mockResolvedValue(OVERVIEW);
  vi.mocked(paymentsService.getPaymentIntent).mockReset().mockResolvedValue(INTENT);
});

afterEach(() => {
  useAuthStore.getState().clearSession();
});

describe('/admin — operations overview landing (issue #68)', () => {
  it('serves the overview board to admins and links it from the admin nav', async () => {
    renderAt('/admin');

    expect(await screen.findByRole('heading', { level: 1, name: 'Operations overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/admin/payments/console');
    expect(adminOverviewService.getAdminOverview).toHaveBeenCalledWith('admin-token', expect.any(AbortSignal));
  });

  it('keeps every admin console reachable from the landing page', async () => {
    renderAt('/admin');
    await screen.findByRole('heading', { level: 1, name: 'Operations overview' });

    const consoles = screen.getByRole('navigation', { name: 'All admin consoles' });
    expect(within(consoles).getByRole('link', { name: 'Payments console' })).toHaveAttribute(
      'href',
      '/admin/payments/console',
    );
    expect(within(consoles).getByRole('link', { name: 'Stuck referrals' })).toHaveAttribute('href', '/admin/referrals');
    expect(within(consoles).getByRole('link', { name: 'Fulfilment disputes' })).toHaveAttribute(
      'href',
      '/admin/disputes',
    );
    expect(within(consoles).getByRole('link', { name: 'Audit trail' })).toHaveAttribute('href', '/admin/audit');
    expect(within(consoles).getByRole('link', { name: 'Feature flags' })).toHaveAttribute('href', '/admin/flags');
    expect(within(consoles).getByRole('link', { name: 'System health' })).toHaveAttribute('href', '/admin/system');
  });
});

describe('/admin/payments/console — relocated payments console (issue #68)', () => {
  it('serves the console with nothing lost from its old home', async () => {
    renderAt('/admin/payments/console');

    expect(await screen.findByRole('heading', { level: 1, name: /Welcome/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Payment intent id')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to admin overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Review stuck referrals' })).toBeInTheDocument();
    expect(adminOverviewService.getAdminOverview).not.toHaveBeenCalled();
  });

  it('still opens an intent from the ?intent= deep link the audit trail uses', async () => {
    renderAt('/admin/payments/console?intent=pi-42');

    expect(await screen.findByText('escrowed')).toBeInTheDocument();
    expect(paymentsService.getPaymentIntent).toHaveBeenCalledWith('pi-42', 'admin-token', expect.any(AbortSignal));
  });
});

describe('admin overview routes — guards', () => {
  it.each<Role>(['patient', 'doctor', 'facility'])('keeps a %s out of both routes without fetching', async (role) => {
    signIn(role);

    renderAt('/admin');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Operations overview' })).not.toBeInTheDocument());
    expect(adminOverviewService.getAdminOverview).not.toHaveBeenCalled();

    renderAt('/admin/payments/console');
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Welcome/ })).not.toBeInTheDocument());
    expect(paymentsService.getPaymentIntent).not.toHaveBeenCalled();
  });
});
