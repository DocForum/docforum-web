import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { createSeedDb, MOCK_ACCESS_TOKEN } from '../../../mocks/fixtures';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as ordersService from '../../../services/orders-service';
import type { FacilityWithDistance, PatientOrder } from '../../../types/models';
import { OrderFulfillment } from './OrderFulfillment';

vi.mock('../../../services/orders-service');

const seedDb = createSeedDb();
const partialOrder = seedDb.orders[0];
const eligibleFacility: FacilityWithDistance = seedDb.facilities.find(
  (facility) => facility.id === 'fac-demo-pharmacy-2',
)!;

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: MOCK_ACCESS_TOKEN,
    user: {
      id: 'usr-patient-demo',
      email: 'pat.placeholder@example.test',
      role: 'patient',
      createdAt: '',
      updatedAt: '',
    },
  });
});

describe('OrderFulfillment (#54)', () => {
  it('shows item quantities, the dispensed-elsewhere warning, and payment rule', () => {
    render(<OrderFulfillment order={partialOrder} />);

    expect(screen.getByRole('heading', { name: /items & fulfillment/i })).toBeInTheDocument();
    expect(screen.getByText('Demo Cetirizine 10mg (fake)')).toBeInTheDocument();
    expect(screen.getAllByText(/dispensed elsewhere/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/already dispensed by Example Chemist \(fake\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(partialOrder.payment?.rule ?? '')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /get remaining items elsewhere/i }),
    ).toBeInTheDocument();
  });

  it('routes outstanding items to another eligible facility', async () => {
    const routedOrder: PatientOrder = {
      ...partialOrder,
      items: (partialOrder.items ?? []).map((item) =>
        item.quantityOutstanding > 0
          ? {
              ...item,
              routedToFacilityId: eligibleFacility.id,
              routedToFacilityName: eligibleFacility.name,
              canDispense: false,
            }
          : item,
      ),
    };
    vi.mocked(ordersService.getEligibleFacilitiesForRemainingItems).mockResolvedValue([
      eligibleFacility,
    ]);
    vi.mocked(ordersService.routeRemainingItems).mockResolvedValue(routedOrder);

    render(<OrderFulfillment order={partialOrder} />);
    await userEvent.click(
      await screen.findByRole('button', { name: /get remaining items elsewhere/i }),
    );

    expect(await screen.findByRole('article', { name: eligibleFacility.name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /choose facility/i }));
    await userEvent.click(screen.getByRole('button', { name: /send remaining items/i }));

    await waitFor(() => {
      expect(ordersService.routeRemainingItems).toHaveBeenCalledWith(
        partialOrder.id,
        {
          facilityId: eligibleFacility.id,
          itemIds: ['itm-demo-rx1-amox', 'itm-demo-rx1-vit'],
        },
        MOCK_ACCESS_TOKEN,
      );
    });
    expect(
      await screen.findByText(/remaining items routed to example chemist/i),
    ).toBeInTheDocument();
  });

  it('explains a 409 when items were dispensed elsewhere before routing', async () => {
    vi.mocked(ordersService.getEligibleFacilitiesForRemainingItems).mockResolvedValue([
      eligibleFacility,
    ]);
    vi.mocked(ordersService.routeRemainingItems).mockRejectedValue(
      new ApiError('Mock API: item was already dispensed elsewhere', 409),
    );

    render(<OrderFulfillment order={partialOrder} />);
    await userEvent.click(
      await screen.findByRole('button', { name: /get remaining items elsewhere/i }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /choose facility/i }));
    await userEvent.click(screen.getByRole('button', { name: /send remaining items/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already dispensed elsewhere/i);
  });
});
