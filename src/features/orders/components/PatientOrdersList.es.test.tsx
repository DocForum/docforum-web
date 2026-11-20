import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../../test/render';
import { makePrescriptionOrder } from '../../../test/factories';
import { PatientOrdersList } from './PatientOrdersList';
import { useMyOrders } from '../hooks/useOrders';
import type { PatientOrder } from '../../../types/models';

vi.mock('../hooks/useOrders');

const ORDER: PatientOrder = makePrescriptionOrder({
  medicationOrTest: 'Demo Amoxicillin 500mg (fake)',
  facilityName: 'Demo Pharmacy (fake)',
  fulfillmentStatus: 'partially_fulfilled',
  expiresAt: '2026-11-18T09:00:00.000Z',
});

function mockOrders(data: PatientOrder[]) {
  vi.mocked(useMyOrders).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  } as never);
}

describe('PatientOrdersList in Spanish (#250)', () => {
  beforeEach(() => {
    vi.mocked(useMyOrders).mockReset();
  });

  it('renders headings, actions and statuses from the Spanish catalogue', () => {
    mockOrders([ORDER]);

    renderWithProviders(<PatientOrdersList />, {
      locale: 'es',
      route: '/patient/orders',
    });

    expect(screen.getByRole('heading', { name: 'Mis pedidos' })).toBeInTheDocument();
    expect(screen.getByText('Receta')).toBeInTheDocument();
    expect(screen.getByText('Parcialmente dispensado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver pedido' })).toBeInTheDocument();
  });

  it('never translates the medication name or facility name', () => {
    mockOrders([ORDER]);

    renderWithProviders(<PatientOrdersList />, {
      locale: 'es',
      route: '/patient/orders',
    });

    expect(screen.getByText('Demo Amoxicillin 500mg (fake)')).toBeInTheDocument();
    expect(screen.getByText(/Demo Pharmacy \(fake\)/)).toBeInTheDocument();
  });

  it('uses the Spanish empty state instead of English copy', async () => {
    mockOrders([]);

    renderWithProviders(<PatientOrdersList />, {
      locale: 'es',
      route: '/patient/orders',
    });

    expect(await screen.findByText('No tienes pedidos.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('You have no orders.')).not.toBeInTheDocument());
  });
});
