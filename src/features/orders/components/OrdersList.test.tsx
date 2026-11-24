import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../test/render';
import {
  makeLabOrder,
  makePrescriptionOrder,
  makeQualifiedOrderFacility,
} from '../../../test/factories';
import { ApiError } from '../../../services/api-client';
import * as ordersService from '../../../services/orders-service';
import { OrdersList } from './OrdersList';

vi.mock('../../../services/orders-service');

// Built with the shared factories (#105) instead of hand-written objects: the
// test states only the fields it asserts on, and factory output always matches
// `src/types/models.ts`.
const ORDERS = [
  makePrescriptionOrder({
    id: 'rx-v2',
    version: 2,
    supersedesId: 'rx-v1',
    medication: 'Corrected medicine (fake)',
    issuedAt: '2026-10-03T09:00:00Z',
  }),
  makePrescriptionOrder({
    id: 'rx-v1',
    version: 1,
    status: 'superseded',
    medication: 'Original medicine (fake)',
    issuedAt: '2026-10-01T09:00:00Z',
  }),
  makeLabOrder({
    id: 'lab-1',
    testName: 'Demo blood panel (fake)',
    issuedAt: '2026-10-04T09:00:00Z',
  }),
];

const FACILITIES = [makeQualifiedOrderFacility({ id: 'fac-lab', name: 'Demo Lab (fake)' })];

beforeEach(() => {
  vi.mocked(ordersService.listMyOrders).mockResolvedValue(ORDERS);
  vi.mocked(ordersService.listQualifiedFacilities).mockResolvedValue(FACILITIES);
  vi.mocked(ordersService.selectFulfillingFacility).mockResolvedValue({
    ...ORDERS[2],
    selectedFacility: { id: 'fac-lab', name: 'Demo Lab (fake)', type: 'lab', isOpen: true },
  });
});

describe('OrdersList', () => {
  it('links each current order to its detail page (issue #61)', async () => {
    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
    // Only current versions are listed, so the superseded rx-v1 has no link.
    const links = screen.getAllByRole('link', { name: /details & payment status/i });
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/patient/orders/rx-v2', '/patient/orders/lab-1']),
    );
    expect(links).toHaveLength(2);
  });

  it('shows only the current version of a superseded order', async () => {
    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(await screen.findByText('Corrected medicine (fake)')).toBeInTheDocument();
    expect(screen.queryByText('Original medicine (fake)')).not.toBeInTheDocument();
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();
    expect(screen.getByText(/earlier version 1 is superseded/i)).toBeInTheDocument();
  });

  it('shows a loading skeleton while orders are loading', () => {
    vi.mocked(ordersService.listMyOrders).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(screen.getByRole('status')).toHaveTextContent(/loading your orders/i);
  });

  it('shows an empty state with action when there are no orders', async () => {
    vi.mocked(ordersService.listMyOrders).mockResolvedValue([]);
    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(await screen.findByText(/no prescriptions or lab orders yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to your care hub/i })).toHaveAttribute(
      'href',
      '/patient',
    );
  });

  it('shows an error state with retry when loading orders fails', async () => {
    vi.mocked(ordersService.listMyOrders).mockRejectedValue(
      new ApiError('Could not load orders', 500),
    );
    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/your orders couldn't be loaded/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/the server had a problem/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows the item summary, expiry and fulfilment status merged from the old list', async () => {
    vi.mocked(ordersService.listMyOrders).mockResolvedValue([
      makePrescriptionOrder({
        id: 'rx-partial',
        fulfillmentStatus: 'partially_fulfilled',
        expiresAt: '2026-11-20T09:00:00Z',
        items: [
          {
            id: 'itm-1',
            orderId: 'rx-partial',
            name: 'Demo item one (fake)',
            quantityPrescribed: 4,
            quantityDispensed: 2,
            quantityOutstanding: 2,
            unit: 'tablets',
            status: 'partially_dispensed',
            canDispense: true,
          },
          {
            id: 'itm-2',
            orderId: 'rx-partial',
            name: 'Demo item two (fake)',
            quantityPrescribed: 2,
            quantityDispensed: 2,
            quantityOutstanding: 0,
            unit: 'tablets',
            status: 'dispensed',
            canDispense: false,
          },
        ],
      }),
    ]);

    renderWithProviders(<OrdersList />, { role: 'patient' });

    expect(await screen.findByText('Partially filled')).toBeInTheDocument();
    expect(screen.getByText('2 items · 1 still outstanding')).toBeInTheDocument();
    expect(screen.getByText(/expires nov 20, 2026/i)).toBeInTheDocument();
  });

  it('loads qualified facilities and records the selected facility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrdersList />, { role: 'patient' });

    await screen.findByText('Demo blood panel (fake)');
    const chooseButtons = screen.getAllByRole('button', { name: /choose facility/i });
    await user.click(chooseButtons[0]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Demo Lab (fake)')).toBeInTheDocument();
    expect(ordersService.listQualifiedFacilities).toHaveBeenCalledWith(
        'lab-1',
        'test-patient-token',
        expect.any(AbortSignal),
      );

    await user.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() => {
      expect(ordersService.selectFulfillingFacility).toHaveBeenCalledWith(
        'lab-1',
        { facilityId: 'fac-lab', expectedVersion: 1 },
        'test-patient-token',
      );
    });
    expect(await screen.findByText(/will be fulfilled by demo lab/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
