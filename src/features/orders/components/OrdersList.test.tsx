import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import * as ordersService from '../../../services/orders-service';
import type { PatientOrder, QualifiedOrderFacility } from '../../../types/models';
import { OrdersList } from './OrdersList';

vi.mock('../../../services/orders-service');

const ORDERS: PatientOrder[] = [
  {
    id: 'rx-v2',
    patientProfileId: 'pat-1',
    orderType: 'prescription',
    version: 2,
    supersedesId: 'rx-v1',
    status: 'active',
    issuedAt: '2026-10-03T09:00:00Z',
    requiresFacilitySelection: true,
    selectedFacility: null,
    medication: 'Corrected medicine (fake)',
    dose: 'One tablet daily',
  },
  {
    id: 'rx-v1',
    patientProfileId: 'pat-1',
    orderType: 'prescription',
    version: 1,
    supersedesId: null,
    status: 'superseded',
    issuedAt: '2026-10-01T09:00:00Z',
    requiresFacilitySelection: true,
    selectedFacility: null,
    medication: 'Original medicine (fake)',
    dose: 'One tablet daily',
  },
  {
    id: 'lab-1',
    patientProfileId: 'pat-1',
    orderType: 'lab_order',
    version: 1,
    supersedesId: null,
    status: 'active',
    issuedAt: '2026-10-04T09:00:00Z',
    requiresFacilitySelection: true,
    selectedFacility: null,
    testName: 'Demo blood panel (fake)',
    fastingRequired: true,
  },
];

const FACILITIES: QualifiedOrderFacility[] = [
  {
    id: 'fac-lab',
    userId: 'usr-lab',
    name: 'Demo Lab (fake)',
    type: 'lab',
    isOpen: true,
    capabilities: ['Sample collection'],
    location: { address: '2 Fixture Lane', city: 'Sampleton', latitude: 0, longitude: 0 },
  },
];

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(ordersService.listMyOrders).mockResolvedValue(ORDERS);
  vi.mocked(ordersService.listQualifiedFacilities).mockResolvedValue(FACILITIES);
  vi.mocked(ordersService.selectFulfillingFacility).mockResolvedValue({
    ...ORDERS[2],
    selectedFacility: { id: 'fac-lab', name: 'Demo Lab (fake)', type: 'lab', isOpen: true },
  });
});

describe('OrdersList', () => {
  it('links each current order to its detail page (issue #61)', async () => {
    render(<OrdersList />);

    expect(await screen.findByRole('heading', { name: 'Your orders' })).toBeInTheDocument();
    // Only current versions are listed, so the superseded rx-v1 has no link.
    const links = screen.getAllByRole('link', { name: /details & payment status/i });
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/patient/orders/rx-v2', '/patient/orders/lab-1']),
    );
    expect(links).toHaveLength(2);
  });

  it('shows only the current version of a superseded order', async () => {
    render(<OrdersList />);

    expect(await screen.findByText('Corrected medicine (fake)')).toBeInTheDocument();
    expect(screen.queryByText('Original medicine (fake)')).not.toBeInTheDocument();
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();
    expect(screen.getByText(/earlier version 1 is superseded/i)).toBeInTheDocument();
  });

  it('loads qualified facilities and records the selected facility', async () => {
    const user = userEvent.setup();
    render(<OrdersList />);

    await screen.findByText('Demo blood panel (fake)');
    const chooseButtons = screen.getAllByRole('button', { name: /choose facility/i });
    await user.click(chooseButtons[0]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Demo Lab (fake)')).toBeInTheDocument();
    expect(ordersService.listQualifiedFacilities).toHaveBeenCalledWith(
        'lab-1',
        'test-token',
        expect.any(AbortSignal),
      );

    await user.click(screen.getByRole('button', { name: /^select$/i }));

    await waitFor(() => {
      expect(ordersService.selectFulfillingFacility).toHaveBeenCalledWith(
        'lab-1',
        { facilityId: 'fac-lab', expectedVersion: 1 },
        'test-token',
      );
    });
    expect(await screen.findByText(/will be fulfilled by demo lab/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
