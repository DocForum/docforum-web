import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrderWalletPayPanel } from './OrderWalletPayPanel';
import { ApiError } from '../../../services/api-client';
import type { PatientOrder, PaymentIntent } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    preparePaymentIntent: vi.fn(),
    submitPaymentIntent: vi.fn(),
    getPaymentIntent: vi.fn(),
    getPaymentIntentForOrder: vi.fn(),
  };
});

vi.mock('../walletPayFlag', () => ({ walletPayEnabled: true, isWalletPayEnabled: (raw: string | undefined) => raw === 'true' }));

import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';

const intentForOrder = vi.mocked(paymentsService.getPaymentIntentForOrder);

const order: PatientOrder = {
  id: 'ord-1',
  patientProfileId: 'pp-1',
  orderType: 'prescription',
  version: 1,
  supersedesId: null,
  status: 'active',
  issuedAt: '2026-10-18T09:00:00.000Z',
  issuedByDoctorName: 'Dr Demo',
  requiresFacilitySelection: false,
  selectedFacility: null,
  medication: 'Amoxicillin 500mg',
  dose: '1 capsule three times daily',
  quantity: '21 capsules',
  instructions: 'Take with food.',
};

function intentWith(status: PaymentIntent['status']): PaymentIntent {
  return {
    id: 'int-1',
    orderType: 'prescription',
    orderId: order.id,
    status,
    patientProfileId: 'pp-1',
    facilityId: 'fac-1',
    amountStroops: '250000000',
    escrowId: status === 'escrowed' ? 'esc-1' : null,
    stellarTxHash: null,
    sorobanContractId: null,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  };
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderWalletPayPanel order={order} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'patient-token',
    user: { id: 'u-1', email: 'pat@example.test', role: 'patient', createdAt: '', updatedAt: '' },
  });
});

describe('OrderWalletPayPanel (flag on)', () => {
  it('renders nothing when the order has no payment intent', async () => {
    intentForOrder.mockResolvedValue(null);
    const { container } = renderPanel();
    await vi.waitFor(() => expect(intentForOrder).toHaveBeenCalledWith(order.id, 'patient-token'));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the endpoint is not served yet (404 is normal)', async () => {
    intentForOrder.mockRejectedValue(new ApiError('Not found', 404));
    const { container } = renderPanel();
    await vi.waitFor(() => expect(intentForOrder).toHaveBeenCalled());
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('offers the wallet flow for a payable intent', async () => {
    intentForOrder.mockResolvedValue(intentWith('created'));
    renderPanel();
    expect(await screen.findByRole('heading', { name: 'Pay with your wallet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay with wallet' })).toBeInTheDocument();
  });

  it('shows only the status for a settled intent — no pay button', async () => {
    intentForOrder.mockResolvedValue(intentWith('escrowed'));
    renderPanel();
    expect(await screen.findByText(/Payment:/)).toBeInTheDocument();
    expect(screen.getByText('Held in escrow')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay with wallet' })).toBeNull();
  });
});
