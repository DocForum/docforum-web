import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { makePrescriptionOrder } from '../../../test/factories';
import * as ordersService from '../../../services/orders-service';
import { OrdersList } from './OrdersList';

vi.mock('../../../services/orders-service');

const ORDERS = [
  makePrescriptionOrder({
    id: 'rx-es-1',
    medication: 'Demo Amoxicillin 500mg (fake)',
    fulfillmentStatus: 'partially_fulfilled',
    selectedFacility: {
      id: 'fac-es-1',
      name: 'Demo Pharmacy (fake)',
      type: 'pharmacy',
      isOpen: true,
    },
    expiresAt: '2026-11-18T09:00:00.000Z',
  }),
];

beforeEach(() => {
  vi.mocked(ordersService.listMyOrders).mockResolvedValue(ORDERS);
});

describe('OrdersList in Spanish (#250)', () => {
  it('renders headings, order types, statuses and actions from the Spanish catalogue', async () => {
    renderWithProviders(<OrdersList />, { locale: 'es', role: 'patient' });

    expect(await screen.findByRole('heading', { name: 'Tus pedidos' })).toBeInTheDocument();
    expect(screen.getByText('Receta')).toBeInTheDocument();
    expect(screen.getByText('Parcialmente dispensado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Detalles y estado del pago' })).toBeInTheDocument();
  });

  it('never translates the medication name or facility name', async () => {
    renderWithProviders(<OrdersList />, { locale: 'es', role: 'patient' });

    expect(await screen.findByText('Demo Amoxicillin 500mg (fake)')).toBeInTheDocument();
    expect(screen.getByText(/Demo Pharmacy \(fake\)/)).toBeInTheDocument();
  });

  it('uses the Spanish empty state instead of English copy', async () => {
    vi.mocked(ordersService.listMyOrders).mockResolvedValue([]);
    renderWithProviders(<OrdersList />, { locale: 'es', role: 'patient' });

    expect(
      await screen.findByText('Aún no hay recetas ni órdenes de laboratorio'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No prescriptions or lab orders yet'),
    ).not.toBeInTheDocument();
  });
});
