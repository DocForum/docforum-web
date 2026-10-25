import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import * as disputesService from '../../services/disputes-service';
import { useAuthStore } from '../../store/auth-store';
import type { Role } from '../../types/models';

vi.mock('../../services/disputes-service');

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: 'admin-token',
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

describe('admin dispute routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn('admin');
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('serves the queue at /admin/disputes', async () => {
    vi.mocked(disputesService.listDisputes).mockResolvedValue({ items: [], nextCursor: null });

    renderAt('/admin/disputes');

    expect(await screen.findByRole('heading', { name: 'Fulfilment disputes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Disputes' })).toHaveAttribute('href', '/admin/disputes');
  });

  it('serves a dispute detail at /admin/disputes/:id', async () => {
    vi.mocked(disputesService.getDispute).mockResolvedValue({
      id: 'dsp-1',
      status: 'open',
      orderId: 'ord-1',
      orderType: 'prescription',
      itemName: 'Demo item',
      patientName: 'Pat Placeholder',
      facility: { id: 'fac-1', name: 'Demo Pharmacy (fake)' },
      amountStroops: '500000000',
      asset: 'XLM',
      reason: 'not_received',
      openedAt: '2026-10-14T08:15:00.000Z',
      updatedAt: '2026-10-14T08:15:00.000Z',
      patientReport: {
        reason: 'not_received',
        description: 'Nothing arrived.',
        submittedAt: '2026-10-14T08:15:00.000Z',
        submittedBy: 'Pat Placeholder',
      },
      facilityProof: null,
      payment: { intentId: 'pin-1', status: 'escrowed', escrowId: 'esc-1' },
      timeline: [],
      resolvedAt: null,
      resolution: null,
      resolutionNotes: null,
      resolvedBy: null,
    });

    renderAt('/admin/disputes/dsp-1');

    expect(await screen.findByRole('heading', { name: 'Demo item' })).toBeInTheDocument();
    expect(disputesService.getDispute).toHaveBeenCalledWith('dsp-1', 'admin-token', expect.any(AbortSignal));
  });

  it('keeps non-admins out of both routes', async () => {
    signIn('patient');

    renderAt('/admin/disputes');

    expect(screen.queryByRole('heading', { name: 'Fulfilment disputes' })).not.toBeInTheDocument();
    expect(disputesService.listDisputes).not.toHaveBeenCalled();
  });
});
