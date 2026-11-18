// Issue #61: the payment panel is part of the order detail view — it
// shows when the order has a payment intent and hides entirely when it
// doesn't (404 → null, mapped in payments-service). A failed lookup for
// any other reason degrades to a quiet note, never a broken page.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { OrderDetailPage } from './OrderDetailPage';
import { useAuthStore } from '../store/auth-store';
import * as ordersService from '../services/orders-service';
import * as paymentsService from '../services/payments-service';
import { ApiError } from '../services/api-client';
import type { Order, PaymentIntent, Prescription } from '../types/models';

vi.mock('../services/orders-service');
vi.mock('../services/payments-service');

function makeOrder(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'ord-rx-1',
    orderType: 'prescription',
    patientProfileId: 'prf-1',
    version: 1,
    supersedesId: null,
    status: 'active',
    issuedAt: '2026-10-16T10:00:00.000Z',
    issuedByDoctorName: 'Dr. Placeholder',
    requiresFacilitySelection: true,
    selectedFacility: { id: 'fac-1', name: 'Example Pharmacy', type: 'pharmacy', isOpen: true },
    medication: 'Metformin 850mg',
    dose: 'One tablet twice daily',
    quantity: '56 tablets',
    instructions: 'Take with food.',
    ...overrides,
  };
}

/** Fixture for the richer Order shape used by <OrderDetail> (getOrder). */
function makeRichOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-rx-1',
    type: 'prescription',
    status: 'active',
    token: 'signed-token-abc',
    items: [{ name: 'Metformin 850mg', note: 'One tablet twice daily' }],
    issuedAt: '2026-10-16T10:00:00.000Z',
    expiresAt: null,
    doctorName: 'Dr. Placeholder',
    facilityName: 'Example Pharmacy',
    patientProfileId: 'prf-1',
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
    ...overrides,
  };
}

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: 'pin-1',
    orderType: 'prescription',
    orderId: 'ord-rx-1',
    status: 'escrowed',
    patientProfileId: 'prf-1',
    facilityId: 'fac-1',
    amountStroops: '1250000000',
    escrowId: 'esc-1',
    stellarTxHash: 'deadbeef',
    sorobanContractId: 'CDEMO',
    createdAt: '2026-10-16T10:05:00.000Z',
    updatedAt: '2026-10-16T11:00:00.000Z',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Deliberately not test/render's wrapper: this page needs a route
  // param, and react-router refuses to nest two <Router>s.
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/patient/orders/ord-rx-1']}>
        <Routes>
          <Route path="/patient/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OrderDetailPage payment panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'test-token',
      user: {
        id: 'usr-1',
        email: 'patient@example.test',
        role: 'patient',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('shows the payment panel when the order has a payment intent', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(makeOrder());
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeRichOrder());
    vi.mocked(paymentsService.getPaymentIntentForOrder).mockResolvedValue(makeIntent());

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Payment' })).toBeInTheDocument();
    expect(screen.getByText(/protection escrow exists for/i)).toBeInTheDocument();
  });

  it('hides the payment panel entirely when the order has no payment intent', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(makeOrder());
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeRichOrder());
    vi.mocked(paymentsService.getPaymentIntentForOrder).mockResolvedValue(null);

    renderPage();

    // The order detail card still renders…
    expect(await screen.findByTestId('order-detail')).toBeInTheDocument();
    // …but no payment panel and no payment error note.
    expect(screen.queryByRole('heading', { name: 'Payment' })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/payment status isn't available/i),
    ).not.toBeInTheDocument();
  });

  it('degrades to a quiet note when the payment lookup fails for another reason', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(makeOrder());
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeRichOrder());
    vi.mocked(paymentsService.getPaymentIntentForOrder).mockRejectedValue(
      new ApiError('boom', 500),
    );

    renderPage();

    // The order detail card still renders…
    expect(await screen.findByTestId('order-detail')).toBeInTheDocument();
    expect(
      await screen.findByText(/payment status isn't available right now/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Payment' })).not.toBeInTheDocument();
  });

  it('shows an order-not-found state for a 404', async () => {
    vi.mocked(ordersService.getPatientOrder).mockRejectedValue(
      new ApiError('order not found', 404),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });
});
